const {
        Control
} = require('magic-home')
Control.ackMask(0b0000)
var sysinfo = require('systeminformation')
var express = require('express')
var app = express()
app.use(express.static('public'))
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
        extended: true
}));

app.get('/white', (_, res) => sysinfo.fsSize('/dev/sda').then(data => res.send(data)))
app.get('/sysinfo', async (_, res) => sysinfo.get({
        osInfo: 'plaform, distro, node, npm',
        system: 'model, manufacturer, raspberry',
        currentLoad: 'avgLoad, currentLoadNice',
        mem: 'total, used, active',
        networkInterfaces: 'ip4, mac, speed',
        bluetoothDevices: `device, name, manufacturer, macDevice, 
			macHost, batteryPercent, type, connected`
}).then(data => res.send(data)))

// panel light service
app.get('/on', (_, res) => light.setPower(true, () => res.end('200')))
app.get('/off', (_, res) => light.setPower(false, () => res.end('200')))
app.post('/panel', async (req, res) => {
        const newState = req.body // the requested state of the light panel
        if (!newState) res.end('no request')
        console.log('processing request...')
        try {
                var panel = new Control("192.168.1.154", {})
                await updateLightState(panel, newState)
                console.log(await getLightState(panel))
        } catch (err) {
                console.log(err)
        } finally {
                res.redirect('/')
        }
})
var getLightState = async (light) => light.queryState().then((data) => data)
var updateLightState = async (light, newState) => {
        var oldState = await getLightState(light)
        // update power state
        var lightPowerPromise = (light, powerState) =>
                new Promise((resolve, reject) =>
                        light.setPower(powerState, resolve))
        oldState.on != ("on" == newState.on) ?
                await lightPowerPromise(light, newState.on) :
                console.log("no power state change");

        // update color state
        var lightColorPromise = (light, colorState) =>
                new Promise((resolve, reject) =>
                        light.setColor(...colorState, resolve))
        var areColorsEqual = (a, b) =>
                a.every((element, index) => element === b[index]);

        var newColor = readColor(newState.color)
        areColorsEqual(newColor, readColor(oldState.color)) ?
                console.log("no color state change") :
                await lightColorPromise(light, newColor)
}
var readColor = (color) => { // "rgb(0, 0, 0)" or {red, green, blue} -> [0, 0, 0]  
        let readQueryColorObj = (color) => [color.red, color.green, color.blue]
        let readColorPickerString = (colorString) => [
                Number(colorString.split(',')[0].slice(4)),
                Number(colorString.split(',')[1].slice(1)),
                Number(colorString.split(',')[2].slice(1, -1))
        ]
        if (typeof color == 'string') return readColorPickerString(color)
        if (typeof color == 'object') return readQueryColorObj(color)
}

app.get('/', (_, res) => res.sendFile('index.html'))
app.listen(8080, () => console.log('Server is listening on port 8080'))
