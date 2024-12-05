const canvas = document.getElementById("pathCanvas");
const ctx = canvas.getContext("2d");

// Canvas dimensions
const canvasWidth = (canvas.width = 600);
const canvasHeight = (canvas.height = 600);

// Scaling factor and offset
const scaleX = 1;
const scaleY = 1;
const offsetX = canvasWidth / 2;
const offsetY = canvasHeight / 8;

// Retrieve previously stored robot paths from localStorage (if any)
let robotPaths = JSON.parse(localStorage.getItem("robotPaths")) || {}; // Initialize with stored data or empty
let robotColors = { 66: "#FF0000", 67: "#0000FF", 68: "#00FF00" }; // Robot color mapping

// Function to update the robot's path on the map
function updatePath(robotId, x, y) {
  if (!robotPaths[robotId]) {
    robotPaths[robotId] = []; // Initialize path for the robot if not already
  }

  // Add the new position to the robot's path
  robotPaths[robotId].push({ x, y });

  // Clear canvas and redraw all robot paths
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw paths for all robots
  for (const id in robotPaths) {
    if (robotPaths.hasOwnProperty(id)) {
      const path = robotPaths[id];
      const color = robotColors[id] || "#000000"; // Use color map or default to black

      // Draw the path for the current robot
      ctx.beginPath();
      ctx.moveTo(-path[0].x * scaleX + offsetX, path[0].y * scaleY + offsetY);

      for (let i = 1; i < path.length; i++) {
        const pos = path[i];
        ctx.lineTo(-pos.x * scaleX + offsetX, pos.y * scaleY + offsetY);
      }

      ctx.strokeStyle = color; // Set robot path color
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw the robot's current position (as a small circle)
      const currentPos = path[path.length - 1];
      ctx.beginPath();
      const currentX = -currentPos.x * scaleX + offsetX;
      const currentY = currentPos.y * scaleY + offsetY;
      ctx.arc(currentX, currentY, 5, 0, 2 * Math.PI); // Draw circle for robot
      ctx.fillStyle = color; // Robot color
      ctx.fill();
    }
  }

  // Save updated paths to localStorage
  localStorage.setItem("robotPaths", JSON.stringify(robotPaths));
}

const messageContent = document.getElementById("messages");
const ws = new WebSocket("ws://222.121.66.27:4001");
const webConnectionStatus = document.getElementById("webConnectionStatus");
ws.onopen = () => {
  console.log("Connected to webSocket server");
  webConnectionStatus.textContent = "webSocket Connected";
  webConnectionStatus.style.color = "green";
};

ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);

    if (message.robot && message.current_pose && message.robot_info) {
      const x = message.current_pose?.pose?.position?.x ?? "N/A";
      const y = message.current_pose?.pose?.position?.y ?? "N/A";
      const z = message.current_pose?.pose?.position?.z ?? "N/A";
      const robotId = message.robot?.id ?? "Unknown";
      //const robotInfo = message.robot_info ?? {};

      // Extract robot_info fields with fallbacks
      const linearVelocity = message.robot_info.linear_velocity ?? "N/A";
      const angularVelocity = message.robot_info.angular_velocity ?? "N/A";
      const linearAcceleration =
        message.robot_info.linear_acceleration ?? "None";

      // Construct the robot info text
      const robotText = `
                        <b>Robot ID:</b> ${robotId} <br>
                        <b>Current Pose:</b> <br>
                        &nbsp;&nbsp;x: ${x}<br>
                        &nbsp;&nbsp;y: ${y}<br>
                        &nbsp;&nbsp;z: ${z}<br>
                        <b>Robot Info:</b> <br>
                        &nbsp;&nbsp;LVel: ${linearVelocity}<br>
                        &nbsp;&nbsp;AVel: ${angularVelocity}<br>
                        &nbsp;&nbsp;mode: ${linearAcceleration}
                        `;

      let robotGroup = document.getElementById(`robot-group-${robotId}`);
      if (!robotGroup) {
        robotGroup = document.createElement("div");
        robotGroup.id = `robot-group-${robotId}`;
        robotGroup.classList.add("message-item");
        messageContent.appendChild(robotGroup);
      }

      robotGroup.innerHTML = robotText;
      if (x !== 0 && y !== 0) {
        updatePath(robotId, x, y);
      }
    } else if (message.joystick) {
      const joystickName = message.joystick?.name ?? "N/A";
      const connect = message.joystick?.connect ?? "N/A";
      const mode = message.joystick.mode;
      const estop = message.joystick.estop;
      const angular = message.joystick.angular;
      const velocity = message.joystick.velocity;
      const axes = [message.joystick.velocity, message.joystick.angular];
      const timeout = message.joystick.timeout / 1000;
      const set_robot_id = message.joystick.set_robot_id;
      const joystickStateDiv = document.getElementById("joystickState");
      const broker_ip = message.joystick.broker_ip;
      if (connect === true) {
        connect_status = "Connected";
        if (estop === true) {
          estop_status = "Pressed";
          joystickStateDiv.style.backgroundColor = "orange";
        } else {
          estop_status = "Released";
          if (mode === 0) {
            mode_status = "Auto";
            joystickStateDiv.style.backgroundColor = "#38e0ab";
          } else {
            mode_status = "Manual";
            joystickStateDiv.style.backgroundColor = "#84599c65";
          }
        }
      } else {
        connect_status = "Disconnected";
        joystickStateDiv.style.backgroundColor = "red";
        estop_status = "Released";
        mode_status = "Auto";
      }

      updateJoystickState(); // Update Joystick Input
      drawJoystick(angular, velocity);

      function updateJoystickState() {
        joystickStateDiv.innerHTML = `<b>Joystick Status:</b> ${connect_status} (${joystickName}) 
                                      <br><b> Control robot ID: </b>${set_robot_id}, <b>Broker IP: </b> ${broker_ip}
                                      <br><b>Mode:</b> ${mode_status} (${timeout}),
                                      <b>Estop:</b> ${estop_status}
                                      <br><b>Axes:</b> 
                                      ${axes
                                        .map((axis) => axis.toFixed(2))
                                        .join(", ")}<br>`;
      }

      function drawJoystick(x, y) {
        const joystickCanvas = document.getElementById("joystickCanvas");
        const ctx = joystickCanvas.getContext("2d");
        const canvasSize = 100; // Width and height of canvas
        const centerX = canvasSize / 2; // Center of the canvas
        const centerY = canvasSize / 2;

        const maxLinearVelocity = 1.5; // Maximum linear velocity (Y-axis)
        const maxAngularVelocity = 0.6; // Maximum angular velocity (X-axis)
        // Clear canvas
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // Draw outer boundary
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerX - 15, 0, 2 * Math.PI);
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw center cross
        ctx.beginPath();
        ctx.moveTo(centerX, 10);
        ctx.lineTo(centerX, canvasSize - 10);
        ctx.moveTo(10, centerY);
        ctx.lineTo(canvasSize - 10, centerY);
        ctx.strokeStyle = "#ddd";
        ctx.stroke();

        // Draw joystick position
        const posX = centerX + (x / maxAngularVelocity) * (centerX - 20);
        const posY = centerY - (y / maxLinearVelocity) * (centerY - 20);

        ctx.beginPath();
        ctx.arc(posX, posY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#39aa3d"; // Green for joystick dot
        ctx.fill();
      }
    }
  } catch (error) {
    console.error("Error parsing JSON:", error);
    messageContent.textContent = "Failed to parse message";
  }
};

ws.onclose = () => {
  console.log("webSocket connection closed");
  webConnectionStatus.textContent = "webSocket Disconnected";
  webConnectionStatus.style.color = "red";
};

ws.onerror = (error) => {
  console.error("Broker error:", error);
};

// Handle clear path button click
document.getElementById("clearButton").addEventListener("click", () => {
  console.log("Clearing robot paths...");

  // Clear the stored robot paths from localStorage
  localStorage.removeItem("robotPaths");

  // Clear the paths from the canvas and messages
  robotPaths = {};
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  messageContent.innerHTML = ""; // Remove all messages
});

//----------------------------------------------------------------
console.log("Starting Connect to MQTT broker");
// Create the MQTT client and connect to the MQTT broker over WebSocket
// const mqttClient = mqtt.connect("ws://localhost:4001");
/*
const mqttClient = mqtt.connect("ws://192.168.0.25:4001", {
username: "stpc",
password: "1234stpc",
});
//const mqttClient = mqtt.connect("ws://192.168.0.185:4001");

mqttClient.on("connect", function () {
console.log("Connected");
});

mqttClient.on("message", function (topic, message) {
console.log(topic + ": " + message.toString());
});

mqttClient.on("error", (error) => {
console.error("MQTT Connection error: ", error);
});

mqttClient.on("close", () => {
console.log("MQTT connection closed");
});

// Handle Start/Stop Button Click
let isRunning = false;

const startButton = document.getElementById("startButton");
startButton.onclick = () => {
isRunning = !isRunning; // Toggle the running state
const command = isRunning ? "start" : "stop"; // Send "start" or "stop" based on state

// Send the command as a JSON object
const message_cmd = JSON.stringify({ command: command });
mqttClient.publish("/web_start_btn", message_cmd, {
    qos: 1,
    retain: true,
});

console.log(`Sent command: ${command}`);
startButton.textContent = isRunning ? "Stop" : "Start"; // Update button text
};*/
