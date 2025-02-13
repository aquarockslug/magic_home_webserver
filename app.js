const { Control } = require("magic-home");
Control.ackMask(0b0000);
var sysinfo = require("systeminformation");
var express = require("express");
var EventEmitter = require("node:events");
var app = express();
app.use(express.static("public"));
const bodyParser = require("body-parser");
app.use(
	bodyParser.urlencoded({
		extended: true,
	}),
);

app.get("/white", (_, res) =>
	sysinfo.fsSize("/dev/sda").then((data) => res.send(data)),
);
app.get("/sysinfo", async (_, res) =>
	sysinfo
		.get({
			osInfo: "plaform, distro, node, npm",
			system: "model, manufacturer, raspberry",
			currentLoad: "avgLoad, currentLoadNice",
			mem: "total, used, active",
			networkInterfaces: "ip4, mac, speed",
			bluetoothDevices: `device, name, manufacturer, macDevice,
	  		macHost, batteryPercent, type, connected`,
			light: await getLightState(light),
		})
		.then((data) => res.send(data)),
);

// panel light
var panel = new Control("192.168.1.154", {});
app.get("/panelInfo", async (_, res) => res.send(await getLightState(panel)));
app.post("/panel", async (req, res) => {
	const newState = req.body; // the requested state of the light panel
	if (!newState) res.end("no request");
	try {
		await updateLightState(panel, newState);
	} catch (err) {
		console.log(err);
	} finally {
		res.redirect("/");
	}
});

async function main() {
	var clock = await createClock();
	clock.on("new_hour", (hour) => {
		console.log(hour);
		updateLightState(panel, randomBlueState());
	});
}
var getNow = async () => ({
	day: String(new Date().getDate()).padStart(2, "0"),
	hour: String(new Date().getHours()).padStart(2, "0"),
	min: String(new Date().getMinutes()).padStart(2, "0"),
});
var createClock = async (interval = 5000) => {
	var timeEvents = new EventEmitter();
	var last = await getNow();
	setInterval(async () => {
		const now = await getNow();
		if (now.day != last.day) timeEvents.emit("new_day", now.day);
		if (now.hour != last.hour) timeEvents.emit("new_hour", now.hour);
		if (now.min != last.min) timeEvents.emit("new_min", now.min);
		last = now;
	}, interval);
	return timeEvents;
};
var randomState = (on = "on") => {
	const r = [~~(Math.random() * 255), ~~(Math.random() * 255)];
	if (r[0] > r[1]) r[1] = [r[0], (r[0] = r[1])][0]; // ensure r[0] < r[1]
	return {
		on,
		color: {
			red: r[0],
			green: r[1] - r[0],
			blue: 255 - r[1],
		},
	};
};
var randomBlueState = (on = "on") => ({
	on,
	color: {
		red: ~~(Math.random() * 55),
		green: ~~(Math.random() * 55),
		blue: ~~(200 + Math.random() * 55),
	},
});

// return a state with the given brightness amount 0-100
var setBrightness = (amount, state) => ({
	on: state.on,
	color: {
		red: state.red + amount * 0.01,
		green: state.green + amount * 0.01,
		blue: state.blue + amount * 0.01,
	},
});

var lightHistory = [];
app.get("/history", async (_, res) => res.send(lightHistory));
var getLightState = async (light) => light.queryState().then((data) => data);
var updateLightState = async (light, newState) => {
	var oldState = await getLightState(light);
	var newColor = readColor(newState.color);

	// Promises to change the light state
	var lightColorPromise = (light, colorState) =>
		new Promise((resolve) => light.setColor(...colorState, resolve));
	var lightPowerPromise = (light, powerState) =>
		new Promise((resolve) => light.setPower(powerState, resolve));

	// compare old state to new state and make promise when necessary
	var areColorsEqual = (a, b) =>
		a.every((element, index) => element === b[index]);
	// TODO validate newState?
	areColorsEqual(newColor, readColor(oldState.color))
		? null
		: await lightColorPromise(light, newColor);

	oldState.on != ("on" == newState.on) // check if power state is opposite
		? await lightPowerPromise(light, newState.on)
		: null;

	newState["time"] = await getNow();
	lightHistory.push(newState);
	console.log(newState);
	return newState;
};
var readColor = (color) => {
	// "rgb(0, 0, 0)" or color: {red, green, blue} -> [0, 0, 0]
	if (typeof color == "object") return Object.values(color);
	if (typeof color == "string")
		return [
			Number(color.substr(",")[0].slice(4)),
			Number(color.substr(",")[1].slice(1)),
			Number(color.substr(",")[2].slice(1, -1)),
		];
};

main();
app.get("/", (_, res) => res.sendFile("index.html"));
app.listen(888, () => console.log("Server is listening on port 888"));
