import React, { useRef, useEffect } from "react"
import Webcam from "react-webcam"
import { Holistic, POSE_LANDMARKS_LEFT,POSE_LANDMARKS_RIGHT,POSE_LANDMARKS,POSE_CONNECTIONS,HAND_CONNECTIONS,  FACEMESH_TESSELATION,FACEMESH_RIGHT_EYE,FACEMESH_RIGHT_EYEBROW,FACEMESH_LEFT_EYE,FACEMESH_LEFT_EYEBROW,FACEMESH_LIPS
} from "@mediapipe/holistic"
import { Camera } from "@mediapipe/camera_utils"
import { drawConnectors,drawLandmarks,lerp } from "@mediapipe/drawing_utils"

export default function Video(props) {
  const faceMeshRef = useRef(null)
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)

  function removeElements(landmarks, elements) {
    for (const element of elements) {
        delete landmarks[element];
    }
  }
  function removeLandmarks(results) {
      if (results.poseLandmarks) {
          removeElements(results.poseLandmarks, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22]);
      }
  }
  function connect(ctx, connectors) {
      const canvas = ctx.canvas;
      for (const connector of connectors) {
          const from = connector[0];
          const to = connector[1];
          if (from && to) {
              if (from.visibility && to.visibility &&
                  (from.visibility < 0.1 || to.visibility < 0.1)) {
                  continue;
              }
              ctx.beginPath();
              ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
              ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
              ctx.stroke();
          }
      }
  }

let activeEffect = 'mask';
const COLOR_LEFT = 'rgb(235,105,233)'
const COLOR_RIGHT = 'rgb(235,105,233)'

function onResults(results) {
  //console.log("results", results)
  const canvasElement = canvasRef.current
  const canvasCtx = canvasElement.getContext('2d');
  // Hide the spinner.
  removeLandmarks(results);
  // Update the frame rate.
  //fpsControl.tick();
  // Draw the overlays.
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.segmentationMask) {
      canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
      // Only overwrite existing pixels.
      if (activeEffect === 'mask' || activeEffect === 'both') {
          canvasCtx.globalCompositeOperation = 'source-in';
          // This can be a color or a texture or whatever...
          canvasCtx.fillStyle = '#00FF007F';
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
      else {
          canvasCtx.globalCompositeOperation = 'source-out';
          canvasCtx.fillStyle = '#0000FF7F';
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
      // Only overwrite missing pixels.
      canvasCtx.globalCompositeOperation = 'destination-atop';
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.globalCompositeOperation = 'source-over';
  }
  else {
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }
  // Connect elbows to hands. Do this first so that the other graphics will draw
  // on top of these marks.
  canvasCtx.lineWidth = 5;
  if (results.poseLandmarks) {
      if (results.rightHandLandmarks) {
          canvasCtx.strokeStyle = 'white';
          connect(canvasCtx, [[
                  results.poseLandmarks[POSE_LANDMARKS.RIGHT_ELBOW],
                  results.rightHandLandmarks[0]
              ]]);
      }
      if (results.leftHandLandmarks) {
          canvasCtx.strokeStyle = 'white';
          connect(canvasCtx, [[
                  results.poseLandmarks[POSE_LANDMARKS.LEFT_ELBOW],
                  results.leftHandLandmarks[0]
              ]]);
      }
  }
  // Pose...
  
  if(results.poseLandmarks) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'white' });
    drawLandmarks(canvasCtx, Object.values(POSE_LANDMARKS_LEFT)
        .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: COLOR_LEFT });
    drawLandmarks(canvasCtx, Object.values(POSE_LANDMARKS_RIGHT)
        .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: COLOR_RIGHT });
  }
  // Hands...
  if(results.rightHandLandmarks) {
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: 'white' });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
        color: 'white',
        fillColor: COLOR_RIGHT,
        lineWidth: 2,
        radius: (data) => {
            return lerp(data.from.z, -0.15, .1, 10, 1);
        }
    });
  }
  if(results.leftHandLandmarks) {
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: 'white' });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
        color: 'white',
        fillColor: COLOR_LEFT,
        lineWidth: 2,
        radius: (data) => {
            return lerp(data.from.z, -0.15, .1, 10, 1);
        }
    });
  }
  // Face...
  if(results.faceLandmarks) {
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYE, { color: COLOR_RIGHT });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYEBROW, { color: COLOR_RIGHT });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYE, { color: COLOR_LEFT });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYEBROW, { color: COLOR_LEFT });
    //drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 5 });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LIPS, { color: COLOR_LEFT, lineWidth: 5 });
  }
  // Draw Hand bounding box 
  let all_coo = []
  if(results.leftHandLandmarks && results.rightHandLandmarks){
    all_coo = results.leftHandLandmarks.concat(results.rightHandLandmarks)
  }else if(results.leftHandLandmarks){
    all_coo = results.leftHandLandmarks
  }else if(results.rightHandLandmarks){
    all_coo = results.rightHandLandmarks
  }
  let all_x = []
  let all_y = []
  all_coo.forEach(element => {
    all_x.push(element.x)
  });
  all_coo.forEach(element => {
    all_y.push(element.y)
  });

  let tl_x = Math.min(...all_x)
  let tl_y = Math.min(...all_y)

  let br_x = Math.max(...all_x)
  let br_y = Math.max(...all_y)

  let height= br_y - tl_y
  let width = br_x - tl_x
    
  canvasCtx.strokeRect(
    tl_x*canvasElement.width,
    tl_y*canvasElement.height,
    width*canvasElement.width,
    height*canvasElement.height);

  canvasCtx.restore();
}

  useEffect(() => {
    const faceMesh = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`
      },
    })
    faceMeshRef.current = faceMesh

    faceMesh.setOptions({
      effect: "background",
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    modelComplexity: 1,
    selfieMode: true,
    smoothLandmarks: true,
    smoothSegmentation: true
    })

    faceMesh.onResults(onResults)

    const camera = new Camera(webcamRef.current.video, {
      onFrame: async (input, size) => {
        console.log(input,size)
        webcamRef.current &&
          (await faceMesh.send({ image: webcamRef.current.video }))
      },
      width: 1240,
      height: 1240,
    })
    camera.start()

    //Fix device pixel Ration issues with Canvas
    if (window.devicePixelRatio != 1){
      console.log("entered here")
      const canvasElement = canvasRef.current
      console.log(canvasElement)
      var w = canvasElement.width;
      var h = canvasElement.height;
      canvasElement.setAttribute('width', w*window.devicePixelRatio);
      canvasElement.setAttribute('height', h*window.devicePixelRatio);
    }
  }, [])


  const cleanUpFunc = () => {
    faceMeshRef.current && faceMeshRef.current.close()
  }

  useEffect(() => {
    return () => {
      cleanUpFunc()
    }
  }, [])

  return (
    <>
      <Webcam ref={webcamRef} screenshotQuality={1} style={{display:'none'}}/>
      <canvas ref={canvasRef} className="output_canvas" style={{width:"1280px", height:"720px"}}></canvas>
    </>
  )
  }