const {
        Control
} = require('magic-home')
Control.ackMask(0b0000)
var sysinfo = require('systeminformation')
var express = require('express')
var EventEmitter = require('node:events');
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
var panel = new Control("192.168.1.154", {})
app.get('/on', (_, res) => light.setPower(true, () => res.end('200')))
app.get('/off', (_, res) => light.setPower(false, () => res.end('200')))
app.post('/panel', async (req, res) => {
        const newState = req.body // the requested state of the light panel
        if (!newState) res.end('no request')
        console.log('processing request...')
        try {
                await updateLightState(panel, newState)
        } catch (err) {
                console.log(err)
        } finally {
                res.redirect('/')
        }
})

async function main() {
        var timeEmitter = await createTimeEmitter()
        timeEmitter.on('new_day', () => updateLightState(panel, {
                color: {
                        red: 255,
                        green: 0,
                        blue: 0
                }
        }))
}

var createTimeEmitter = async () => {
        var dateEvents = new EventEmitter()
        var getDay = async () => String(new Date().getDate()).padStart(2, '0')
        var currentDay = await getDay()
        setInterval(async () => {
                const day = await getDay()
                if (currentDay != day) {
                        currentDay = day
                        dateEvents.emit('new_day')
                }
        }, 10000)
        return dateEvents
}
var getLightState = async (light) => light.queryState().then((data) => data)
var updateLightState = async (light, newState) => {
        var oldState = await getLightState(light)
        var newColor = readColor(newState.color)

        // Promises to change the light state
        var lightColorPromise = (light, colorState) =>
                new Promise((resolve, reject) =>
                        light.setColor(...colorState, resolve))
        var lightPowerPromise = (light, powerState) =>
                new Promise((resolve, reject) =>
                        light.setPower(powerState, resolve))

        // compare old state to new state and make promise when necessary
        var areColorsEqual = (a, b) =>
                a.every((element, index) => element === b[index]);
        areColorsEqual(newColor, readColor(oldState.color)) ?
                console.log("no color state change") :
                await lightColorPromise(light, newColor)

        oldState.on != ("on" == newState.on) ? // check if power state is opposite
                await lightPowerPromise(light, newState.on) :
                console.log("no power state change");

        console.log("updated lighting")
}
var readColor = (color) => { // "rgb(0, 0, 0)" or color: {red, green, blue} -> [0, 0, 0]  
        let readQueryColorObj = (color) => [color.red, color.green, color.blue]
        let readColorPickerString = (colorString) => [
                Number(colorString.split(',')[0].slice(4)),
                Number(colorString.split(',')[1].slice(1)),
                Number(colorString.split(',')[2].slice(1, -1))
        ]
        if (typeof color == 'string') return readColorPickerString(color)
        if (typeof color == 'object') return readQueryColorObj(color)
}

main()
app.get('/', (_, res) => res.sendFile('index.html'))
app.listen(8080, () => console.log('Server is listening on port 8080'))
