
// import Replicate from "replicate";

// import fetch from "node-fetch";


// const replicate = new Replicate({
//   // get your token from https://replicate.com/account
//   auth: "0ae42be11f9282b5ccadbadf2949aa20fe9d6a9d",
//   fetch: window.fetch
// });
// 
const REPLICATE_API_URL = 'https://dev.soundmosaic.pixelynx-ai.com/replicate';
// const REPLICATE_API_URL = 'http://localhost:12320/replicate';
const SOUNDMOSAIC_TOKEN = "273b1dda33244edf921264fe374994fe"



export async function createImage(input) {

  // remove all null values. clone first
  input = removeNullValues(input);

  console.log("calling createimage with input", input)
  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    },
    body: JSON.stringify({
      version: "3c64e669051f9b358e748c8e2fb8a06e64122a9ece762ef133252e2c99da77c1",
      input
      
    })
  });

  const data = await response.json();
  console.log("got data", data)
  
  return data.id || "";
};

// const output = await replicate.run(
//   "okaris/roop:8c1e100ecabb3151cf1e6c62879b6de7a4b84602de464ed249b6cff0b86211d8",
//   {
//     input: {
//       source: "https://replicate.delivery/pbxt/Iuqa9NKGjfnWYxsRDRzTsHEvRDzAlmv2u20mk2PsLZ1ZRR8k/Reunia%CC%83o_com_o_ator_norte-americano_Keanu_Reeves_(cropped).jpg",
//       target: "https://replicate.delivery/pbxt/Iuqa9ruhfJLtB38Xqlzkdq4EcbsXHJRiG9DDqJ66gPdibjDw/Terminator%202_%20%20Hasta%20La%20Vista%20Baby%204K%20Remastered%202017%20_%203D.mp4",
//       keep_fps: true,
//       keep_frames: true,
//       enhance_face: false
//     }
//   }
// );
// console.log(output);
export async function faceSwap(selfie_url, extractFrame=false) {
  let face_video_url = getRandomFaceVideo();
  console.log("faceSwap", face_video_url.slice(0,100), selfie_url.slice(0,100), extractFrame)
  if (extractFrame) {
    const firstFrame = await getFirstFrameAsBase64(face_video_url);
    console.log("extracted firstFrame", firstFrame.slice(0, 100)+"...")
    face_video_url = firstFrame;
  }
  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    },
    body: JSON.stringify({
      version: "8c1e100ecabb3151cf1e6c62879b6de7a4b84602de464ed249b6cff0b86211d8",
      input: {
        source: selfie_url,
        target: face_video_url,
        keep_fps: true,
        keep_frames: true,
        enhance_face: true
      }
    })
  });


  const data = await response.json();
  console.log("got data", data)

  return data.id || "";
}

// Function to smooth a generated face swap video
export async function smoothVideo(videoUrl) {
  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    },
    body: JSON.stringify({
      version: "e4df805c481234a312c9e28f862ea0fb70bc01c9deb0e1fcd2965a2e5d866d52",
      input: {
        video: videoUrl,
        interpolation_factor: 2
      }
    })
  });

  const data = await response.json();
  console.log("got data", data)

  return data.id || "";
}

// 4311baa0c94c675d74858648ce9a6287753ba16fa70f75ab59422b4c9d13fe73
// another video smoother. just pass the video prop
export const smoothVideoAMT = async (videoUrl) => {
  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    },
    body: JSON.stringify({
      version: "ea97fae8dd0d667c79c3eb69b6ce6d40706356ea42009530da64df3097d77924",
      input: {
        video: videoUrl,
      }
    })
  });

  const data = await response.json();
  console.log("got data", data)

  return data.id || "";
}

const getRandomFaceVideo = () => {
  const videosSplit = videos.split("\n");
  const randomIndex = Math.floor(Math.random() * videosSplit.length);
  return `https://soundmosaic-dev.s3.amazonaws.com/picmosaic/blackmirror/${videosSplit[randomIndex]}`;
}
 
const videos= `transmoderna_transhumanism_dystopic_fcc31db6-d116-4208-9d8e-588ba893b12e.mp4
transmoderna_transhumanism_dystopic_ea49c800-8884-43af-bb17-387a5a29b798.mp4
transmoderna_transhumanism_dystopic_d9126067-9ac3-4834-aaea-0f2c6daf7555.mp4
transmoderna_transhumanism_dystopic_beae715e-6f17-4162-b5da-006355f8b0e4.mp4
transmoderna_transhumanism_dystopic_79340157-dd3b-4aba-8feb-8f3f815977f0.mp4
transmoderna_transhumanism_dystopic_40aab7df-3299-4e11-aced-6482fa847f7c.mp4
chains-around-the-ne 1b8f34eb-2268-4718-8143-5e3a48b0452c.mp4
chains-around-the-ne 3a477352-3acb-41a6-80f4-0982cb0ad684.mp4
chains-around-the-ne 4201135d-9b09-41e5-b710-f6a0e34e66cc.mp4
chains-around-the-ne 4cf0a5f7-805c-4085-8ba5-65fb9e527dcb.mp4
chains-around-the-ne 81a0e2f7-d2b8-4e2f-8f20-bf1c52dd18d1.mp4
chains-around-the-ne 96a0d089-e446-4ca4-bb58-25b1ec35f3b0.mp4
chains-around-the-ne d71f7e9e-d600-459f-af33-6968e495da53.mp4
chains-around-the-ne e88c27f7-a59b-4b60-a489-f697a0c335d8.mp4
dystopic-bad-dream 3eca431a-3ac9-4794-9caa-03cd36c2c15d.mp4
dystopic-bad-dream c2c262cf-e3ba-4c42-b5f8-b9a8e18c8b9b.mp4
dystopic-bad-dream c5d51890-6fb2-4f50-8b0b-68fbd614e0a0.mp4
dystopic-bad-dream c71111fe-a87a-4460-9528-d2a7cbc6f6f0.mp4
modified-face-trans 423a41f9-72f2-4cc9-ac54-2c722208681d.mp4
modified-face-trans 6612e6c4-8620-42b9-9a72-6c3c6ae6a4ea.mp4
modified-face-trans da736316-9d35-4d5f-a578-78499680f2ef.mp4
nosedive_lacie.mov
lacie1.mov
lacie2.mov
lacie3.mov
lacie4.mov
lacie5.mov
lacie6.mov`;

function removeNullValues(input) {
  input = JSON.parse(JSON.stringify(input));
  Object.keys(input).forEach(key => input[key] == null && delete input[key]);
  return input;
}

export async function extractPrompt(base64_image_url) {
  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    },
    body: JSON.stringify({
      version: 'd90ed1292165dbad1fc3fc8ce26c3a695d6a211de00e2bb5f5fec4815ea30e4c',
      input: {
        image: base64_image_url,
        mode: "fast"
      },
    })
  });

  const data = await response.json();
  console.log("got data", data)

  return data.id;
}

export async function getPrediction(predictionId, statusCallback=() => null) {
  // Poll for the result
  const result = await pollForResult(predictionId, statusCallback);

  return result;
};

async function pollForResult(predictionId, statusCallback) {
  const pollInterval = 1000; // 3 seconds

  while (true) {
    try {
      const response = await fetch(`${REPLICATE_API_URL}/${predictionId}?seed=${Math.floor(Math.random()*100000)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${SOUNDMOSAIC_TOKEN}`
        }
      });

      const data = await response.json();
      console.log("status", data)
      statusCallback(data);
      if (data.status === 'succeeded' || data.status === 'failed') {
        return data;
      }

      // Wait for the next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      // Handle any errors here
      console.error('Error while polling for result:', error);
      return null;
    }
  }
}


export async function getPredictionList(model="okaris/roop", url=null) {

  if (!url)
    url = REPLICATE_API_URL+"/?filter=model:"+model+"&cacheBust="+Math.floor(Math.random()*100000);
  console.log("calling getPredictionList with url", url)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    }
  });

  const data = await response.json();
  // console.log("predictions", data)

  return data.results.filter(r => r.status === "succeeded");
}



export async function deletePrediction(predictionId) {
  const response = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${SOUNDMOSAIC_TOKEN}`
    }
  });

  const data = await response.json();
  console.log("Delete prediction response: %O", data);
  return data;
}


export async function getFirstFrameAsBase64(videoUrl) {
  return new Promise((resolve, reject) => {
    // Create video element
    let video = document.createElement('video');

    // Once the metadata has been loaded, draw the image on the canvas and convert it to base64
    video.onloadedmetadata = function() {
      let canvas = document.createElement('canvas');
      canvas.width = this.videoWidth;
      canvas.height = this.videoHeight;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
      let base64Image = canvas.toDataURL('image/png');

      // Display the canvas
      document.body.appendChild(canvas);

      resolve(base64Image);
    };

    // Error handling
    video.onerror = function() {
      reject("Error loading video file");
    };

    // Set video src
    video.src = videoUrl;
  });
}


// language model

// const prediction = await replicate.predictions.create({
//     version: "1450546356d09a24302f96b3dacb301ca529f16254d3f413d630ac75ee11b1e2",
//     input: {
//       prompt: "..."
//     },
//   });


export async function respondText(text) {
    // use fetch
  const response = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${SOUNDMOSAIC_TOKEN}`
      },
      body: JSON.stringify({
        version: "1510dd7e9dc7142cca0c8bb899b9eb2f339d686d9ded0e33720ecaeccdfb3146",
        input: {
          prompt: text
        },
      })
    });
  const prediction = await response.json();

  const predictionId = prediction.id;

  const data = await getPrediction(predictionId);
  return data.output.join("");
}



// respondText("hello kitty").then(res => console.log("prediction", res));