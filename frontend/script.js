const form = document.getElementById("taskForm");
const taskList = document.getElementById("taskList").querySelector("tbody");
const taskLogs = document.getElementById("taskLogs").querySelector("tbody");

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  const taskName = document.getElementById("taskName").value;
  const frequency = document.getElementById("frequency").value;

  const response = await fetch("http://localhost:3000/add-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskName, frequency }),
  });

  const result = await response.json();
  if (result.success) {
    alert("Task scheduled successfully");
    // Append new task to the task list
    const row = taskList.insertRow();
    row.id = `task-${taskName}`; // Add unique ID to the row for easy removal later
    row.innerHTML = `
      <td>${taskName}</td>
      <td>${frequency}</td>
      <td>${result.nextExecution}</td>
      <td>Active</td>
    `;
  } else {
    alert("Error scheduling task");
  }
});

// Fetch all tasks and display them
async function showData() {
  const allTask = await fetch("http://localhost:3000/tasks");
  const allTaskRes = await allTask.json();
  taskList.innerHTML = ""; // Clear current task list
  allTaskRes.map((task) => {
    const row = taskList.insertRow();
    row.id = `task-${task.taskName}`; // Add unique ID to the row for easy removal later
    row.innerHTML = `
      <td>${task.taskName}</td>
      <td>${task.frequency}</td>
      <td>${task.nextExecution}</td>
      <td>Active</td>
    `;
  });
}

// Fetch all logs and display them
async function showLogData() {
  const allTask = await fetch("http://localhost:3000/logs");
  const allTaskRes = await allTask.json();
  taskLogs.innerHTML = ""; // Clear current logs
  allTaskRes.map((task) => {
    // Remove the task from the task list when it moves to the logs
    const taskRow = document.getElementById(`task-${task.taskName}`);
    if (taskRow) {
      taskRow.remove();
    }

    // Add the task to the logs section
    const row = taskLogs.insertRow();
    row.innerHTML = `
      <td>${task.taskName}</td>
      <td>${new Date(task.executionTime).toLocaleString()}</td>
      <td>${task.status}</td>
      <td>${task.message}</td>
    `;
  });
}

// Polling function to update logs periodically (every 5 seconds)
setInterval(async () => {
  await showLogData();
}, 5000); // Fetch logs every 5 seconds

// Initial data loading
showData();
showLogData();
