const {
        Control
} = require('magic-home')
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

// light service
var light = new Control("192.168.1.154", {})
app.get('/on', (_, res) => light.setPower(true, () => res.end(light)))
app.get('/off', (_, res) => light.setPower(false, () => res.end(light)))
app.post('/panel', (req, res) => {
        const state = req.body // the requested state of the light panel
        try {
                light.setPower(true)
                light.setColor(...readColorString(state.color))
        } catch (err) {
                console.log(err)
        } finally {
                res.end(JSON.stringify(light.queryState()))
        }
})
var readColorString = (colorString) => [
        Number(colorString.split(',')[0].slice(4)),
        Number(colorString.split(',')[1].slice(1)),
        Number(colorString.split(',')[2].slice(1, 2))
]
app.get('/', (_, res) => res.sendFile('index.html'))
app.listen(8080, () => console.log('Server is listening on port 8080'))
