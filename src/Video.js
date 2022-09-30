import React, { useRef, useEffect } from "react"
import Webcam from "react-webcam"
import { Holistic } from "@mediapipe/holistic"
import { Camera } from "@mediapipe/camera_utils"

export default function Video(props) {
  const faceMeshRef = useRef(null)
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)
  const filterImgRef = useRef({ current: null })

  function onResults(results) {
    console.log(results)
    const videoWidth = webcamRef.current.video.videoWidth
    const videoHeight = webcamRef.current.video.videoHeight

    canvasRef.current.width = videoWidth
    canvasRef.current.height = videoHeight
    const canvasElement = canvasRef.current
    const canvasCtx = canvasElement.getContext("2d")
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    )
    if (results.multiFaceLandmarks.length > 0) {
      const keypoints = results.multiFaceLandmarks[0]

      const maskWidth = Math.abs(
        keypoints[234].x * videoWidth - keypoints[454].x * videoWidth
      )
      const maskHeight =
        Math.abs(
          keypoints[234].y * videoHeight - keypoints[152].y * videoHeight
        ) + 10
      filterImgRef.current.width = `${maskWidth}`
      filterImgRef.current.height = `${maskHeight}`

      canvasCtx.drawImage(
        filterImgRef.current,
        keypoints[234].x * videoWidth,
        keypoints[234].y * videoHeight - 10,
        maskWidth,
        maskHeight
      )
    }
  }

  useEffect(() => {
    console.log("tes")
    const faceMesh = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      },
    })
    faceMeshRef.current = faceMesh

    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    faceMesh.onResults(onResults)

    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null
    ) {
      const maskFilterImage = document.createElement("img", {
        ref: filterImgRef,
      })
      maskFilterImage.objectFit = "contain"
      maskFilterImage.onload = function () {
        filterImgRef.current = maskFilterImage
        webcamRef.current.video.crossOrigin = "anonymous"

        const camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            webcamRef.current &&
              (await faceMesh.send({ image: webcamRef.current.video }))
          },
          width: 640,
          height: 480,
        })
        camera.start()
      }
      maskFilterImage.src = "images/mask.png"
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
      <Webcam ref={webcamRef} />
      <canvas ref={canvasRef} className="output_canvas"></canvas>
    </>
  )
  }