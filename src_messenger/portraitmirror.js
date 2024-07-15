import login from "fb-chat-api-temp";
import dotenv from "dotenv";
import fs from "fs";
import {respondText} from "./replicate.js";
import OpenAI  from "openai";
import fetch from "node-fetch";

const myID="61011625";
dotenv.config();

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

login({appState: JSON.parse(fs.readFileSync('appState.json', 'utf8'))}, (err, api) => {
    if(err) return console.error(err);
    console.log("Logged in!");

    api.setOptions({selfListen: true})
    
    let threadHistories = {};
    const stopListening = api.listenMqtt(async (err, event) => {
        if(err) return console.error(err);
        // console.log("fb event", event);
        api.markAsRead(event.threadID, (err) => {
            if(err) console.error(err);
        });


        switch(event.type) {
            case "message":
                if(event.body === '/stop') {
                    api.sendMessage("Goodbye…", event.threadID);
                    return stopListening();
                }

                if (event.threadID && !threadHistories[event.threadID]) {
                    const threadHistory = await api.getThreadHistory(event.threadID);
                    console.log("thread history", threadHistory);
                    const threadHistoryConverted = threadHistory
                    .filter(m => m.body?.length > 0)
                    .map(message => ({
                        role: message.sendId === myID? "assistant" : "user",
                        content: message.body,
                    }));
                    threadHistories[event.threadID] = threadHistoryConverted;
                }

                if (event.body.startsWith("")) {
                    const message = event.body;
                    const lastMessageSent =  threadHistories[event.threadID][threadHistories[event.threadID].length - 1].content;
                    if (lastMessageSent?.trim() === message.trim()) {
                        console.log("same message")
                        break;
                    }
                    console.log("messages are different")
                    console.log(message)
                    console.log("----")
                    console.log(lastMessageSent)
                    const messageHistory = threadHistories[event.threadID];
                    messageHistory.push({ role: "user", content: message });
                    console.log("messageHistory", messageHistory)
                    // process.exit(0);
                    const messageHistoryLastTen = messageHistory.slice(-4);
                    const markdown = messageHistoryToMarkdown(messageHistoryLastTen);
                    const mostSimilarConversations = await getSimilarConversations(markdown);
                    // add the most similar as one message by the assistant at the start of the history
                    console.log("mostSimilarConversations", mostSimilarConversations)
                    const messageHistoryLastTenWithMostSimilarConversations = [
                        { 
                            role: "assistant",
                            content: `# most similar conversations:\n\n ${mostSimilarConversations}`
                        },
                        ...messageHistoryLastTen];
                    const response = await respondTextOllama(messageHistoryLastTenWithMostSimilarConversations);
                    messageHistory.push({ role: "assistant", content: response });
                    api.sendMessage(response, event.threadID);
                    break;
                }
            case "event":
                console.log(event);
                break;
        }
    });
});


// curl http://150.136.112.172:11434/api/chat -d '{
//     "model": "thomash",
//     "messages": [
//       { "role": "user", "content": "why is the sky blue?" }
//     ], "stream":false}'
// use fetch
const respondTextOllama = async messageHistory => {
    console.log("messageHistory", messageHistory);
    const chatCompletion = await fetch("http://localhost:11434/api/chat", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: "thomash",
            messages: messageHistory,
            stream: false
        })
    });
    // response contains a messages object
    const data = await chatCompletion.json();
    console.log("data", data)
    return data.message.content;
}

// at port 11535 there is a Retrieval service running
// /query?q=[urlencoded conversation]
// returns the 3 most similar conversations
async function getSimilarConversations(conversation) {
    const response = await fetch("http://localhost:11535/query?q=" + encodeURIComponent(conversation));
    const data = await response.json();
    console.log("data", data)
    // shorten each conversation to maximum of 300 characters
    const shortenedData = data.response.map(conversation => conversation.slice(0, 200));
    return shortenedData.join("\n\n");;
}

// message history to markdown
// formats a message object list as
// user: bla
// assistant: blub
// returns a markdown string

function messageHistoryToMarkdown(messageHistory) {
    let markdown = "";
    messageHistory.forEach(message => {
        markdown += message.role + ": " + message.content + "\n";
    });
    return markdown;
}