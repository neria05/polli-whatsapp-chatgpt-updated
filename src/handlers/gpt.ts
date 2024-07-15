import os from "os";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Message, MessageMedia } from "whatsapp-web.js";
import { chatgpt } from "../providers/openai";
import * as cli from "../cli/ui";
import config from "../config";
import ffmpeg from "fluent-ffmpeg";

import { ChatMessage } from "chatgpt";

// TTS
import { ttsRequest as speechTTSRequest } from "../providers/speech";
import { ttsRequest as awsTTSRequest } from "../providers/aws";
import { ttsRequest as elevenlabsTTSRequest } from "../providers/elevenlabs";

import { TTSMode } from "../types/tts-mode";

// Moderation
import { moderateIncomingPrompt } from "./moderation";
import { aiConfig, getConfig } from "./ai-config";
import { generateAudio } from "../providers/musicgen";

// New import for executing shell commands
import { exec } from 'child_process';
import { promisify } from 'util';
import { handleMessageDALLE } from "./dalle";
const execAsync = promisify(exec);
// Mapping from number to last conversation id
const conversations = {};

console.log("pre prompt", process.env.PRE_PROMPT)
console.log(process.env.PRE_PROMPT)
// process.exit(0)
const handleMessageGPT = async (message: Message, prompt: string) => {
	console.log("message", message["_data"]);
	try {
		// Get last conversation
		const lastConversationId = conversations[message.from];

		cli.print(`[GPT] Received prompt from ${message.from}: ${prompt}`);

		// Prompt Moderation
		if (config.promptModerationEnabled) {
			try {
				await moderateIncomingPrompt(prompt);
			} catch (error: any) {
				message.reply(error.message);
				return;
			}
		}

		const start = Date.now();

		// Check if we have a conversation with the user
		let response: ChatMessage;
		if (lastConversationId) {
			// Handle message with previous conversation
			// log prompt
			cli.print(`[GPT] Continuing conversation with ${message.from} (ID: ${lastConversationId})`);
			cli.print(`[GPT] Prompt: ${prompt}`);
			response = await chatgpt.sendMessage(prompt, {
				parentMessageId: lastConversationId,
				name: sanitizeName(message["_data"]?.notifyName),
			});
		} else {
			let promptBuilder = "";

			// Pre prompt
			if (config.prePrompt != null && config.prePrompt.trim() != "") {
				promptBuilder += config.prePrompt + "\n\n";
			}
			promptBuilder += prompt + "\n\n";

			// Handle message with new conversation
			// log prompt
			cli.print(`[GPT] Starting new conversation with ${message.from}`);
			cli.print(`[GPT] Prompt: ${prompt}`);
			response = await chatgpt.sendMessage(promptBuilder,{
				name: sanitizeName(message["_data"]?.notifyName),
			});

			cli.print(`[GPT] New conversation for ${message.from} (ID: ${response.id})`);
		}
		
		// Set conversation id
		conversations[message.from] = response.id;

		const end = Date.now() - start;

		cli.print(`[GPT] Answer to ${message.from}: ${response.text}  | OpenAI request took ${end}ms)`);

		// TTS reply (Default: disabled)
		if (getConfig("tts", "enabled")){ // && message.type !== "chat") {
			sendVoiceMessageReply(message, response.text);
			// message.reply(response.text);
			return;
		}

		// Default: Text reply
		message.reply(response.text);
	} catch (error: any) {
		console.error("An error occured", error);
		message.reply("An error occured, please contact the administrator. (" + error.message + ")");
	}
};

const handleDeleteConversation = async (message: Message) => {
	// Delete conversation
	delete conversations[message.from];

	// Reply
	message.reply("Conversation context was resetted!");
};

async function sendVoiceMessageReply(message: Message, gptTextResponse: string) {
	let logTAG = "[TTS]";
	let ttsRequestFunction;

	switch (config.ttsMode) {
		case TTSMode.SpeechAPI:
			logTAG = "[SpeechAPI]";
			ttsRequestFunction = speechTTSRequest;
			break;
		case TTSMode.AWSPolly:
			logTAG = "[AWSPolly]";
			ttsRequestFunction = awsTTSRequest;
			break;
		case TTSMode.ElevenLabs:
			logTAG = "[ElevenLabs]";
			ttsRequestFunction = elevenlabsTTSRequest;
			break;
		default:
			logTAG = "[SpeechAPI]";
			ttsRequestFunction = speechTTSRequest;
			break;
	}

	
	
	// extract 
	// response
	// audio prompt from gptTextResponse
	// image prompt
	// if you cannot find the strings just set all prompts to the whole response
	//Response format:
	// [response]
	// Image prompt: [image prompt]
	// Audio prompt: [audio prompt]
	// 

	const { audioPrompt, imagePrompt, response } = extractPrompts(gptTextResponse)

	const imagePromptSuffix = "in a futuristic forest, with a dystopian city melting in black and gold liquid, and black holograms of hybrid mythical creature"
	if (Math.random() < 0.3)
		handleMessageDALLE(message, imagePromptSuffix+". "+imagePrompt)

	// Start generating audio and TTS request in parallel
	cli.print(`${logTAG} Generating audio from GPT response "${gptTextResponse}"...`);
	const [audioBuffer, audioFile] = await Promise.all([
		ttsRequestFunction(response),
		generateAudio(audioPrompt)
	]);

	// Check if audio buffer is valid
	if (audioBuffer == null || audioBuffer.length == 0) {
		message.reply(`${logTAG} couldn't generate audio, please contact the administrator.`);
		return;
	}

	if (!audioFile) {
		throw new Error("could not get generated audio");
	}

	cli.print(`${logTAG} Audio generated!`);

	// Get temp folder and file path
	const tempFolder = os.tmpdir();
	const tempFilePath = path.join(tempFolder, randomUUID() + ".opus");

	// Save buffer to temp file
	fs.writeFileSync(tempFilePath, audioBuffer);
	// Process audio with the all-in-one Python script
	const processedAudioPath = await processAudioWithPythonScript(tempFilePath, audioFile);

	if (!processedAudioPath) {
		throw new Error("could not process audio with Python script");
	}
	// Convert processed audio to OPUS format
	const opusAudioPath = processedAudioPath;// await convertAudioToOpus(processedAudioPath);
	// if (!opusAudioPath) {
	// 	throw new Error("could not convert audio to OPUS format");
	// }
	// Send converted OPUS audio
	const messageMedia = MessageMedia.fromFilePath(opusAudioPath as string);
	console.log("uploading", opusAudioPath)
	message.reply(messageMedia,undefined, { sendAudioAsVoice:true, caption: response});


	// Delete processed and OPUS audio temp files
	// fs.unlinkSync(processedAudioPath);
	fs.unlinkSync(opusAudioPath as string);

	// Delete common temp files
	fs.unlinkSync(tempFilePath);
}


const extractPrompts = (gptTextResponse: string) => {
  const regex = /(.*?)Image prompt:(.*?)Audio prompt:(.*)/s;
  const match = regex.exec(gptTextResponse);
  gptTextResponse = gptTextResponse.slice(0, 200)
  const response = match && match[1] ? match[1].trim() : gptTextResponse;
  const imagePrompt = match && match[2] ? match[2].trim() : gptTextResponse;
  const audioPrompt = match && match[3] ? match[3].trim() : gptTextResponse;

  console.log("extracted", { response, imagePrompt, audioPrompt });
  return { response, imagePrompt, audioPrompt };
};

const convertAudioToOpus = async (inputPath:string) => {
	const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".opus";
	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.output(outputPath)
			.audioCodec('libopus')
			.on('end', () => resolve(outputPath))
			.on('error', (err) => reject(err))
			.run();
	});
};

// Replacing audio processing functions with a call to the Python script
const processAudioWithPythonScript = async (ttsFilePath: string, backgroundFilePath: string): Promise<string> => {
	try {
	  const { stdout } = await execAsync(`python3 src_audio_fx/mix_bg_and_tts.py "${ttsFilePath}" "${backgroundFilePath}"`);
	  return stdout.trim(); // The Python script outputs the path of the processed file
	} catch (error) {
	  throw new Error(`Failed to process audio with Python script: ${error}`);
	}
  };

  
const sanitizeName = (name: string) => {
	if (!name) return "unknown";
	return name.replace(/[^a-zA-Z0-9]/g, "");
};


export { handleMessageGPT, handleDeleteConversation };
