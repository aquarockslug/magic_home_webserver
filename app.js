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
        try {
                var panel = new Control("192.168.1.154", {})
                await updateState(panel, newState)
                console.log(await lightState(panel))
                res.end('200')
        } catch (err) {
                console.log(err)
        } finally {
                console.log('processing request...')
        }
})
var lightPromise = (light, power) => {
        return new Promise((resolve, reject) =>
                light.setPower(power, resolve))
}
var updateState = async (light, newState) => {
        var oldState = await lightState(light)
        console.log(oldState.on)
        console.log(newState.on)
        if (oldState.on != (newState.on == 'on' ? true : false))
                await lightPromise(light, newState.on)
        else console.log('no change')
        // light.setColor(...radColorString(newState.color), () => 200)
}
var lightState = async (light) => light.queryState().then((data) => data)
var readColorString = (colorString) => [
        Number(colorString.split(',')[0].slice(4)),
        Number(colorString.split(',')[1].slice(1)),
        Number(colorString.split(',')[2].slice(1, 2))
]
app.get('/', (_, res) => res.sendFile('index.html'))
app.listen(8080, () => console.log('Server is listening on port 8080'))
