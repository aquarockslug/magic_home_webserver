const {
        Control
} = require('magic-home')
var sysinfo = require('systeminformation')
var express = require('express')
var app = express()
app.use(express.static('public'))

app.get('/white', (_, res) => sysinfo.fsSize('/dev/sda').then(data => res.send(data)))
app.get('/sysinfo', async (_, res) => {
        data = await Promise.all([sysinfo.fsSize(), sysinfo.cpu()])
        res.send(data)
})
// light service
var light = new Control("192.168.1.154")
app.get('/on', (_, res) => light.setPower(true, () => res.end(light)))
app.get('/off', (_, res) => light.setPower(false, () => res.end(light)))
app.post('/panel', (req, res) => {
        const b = req.body
        try {
                if (b.power == 'on') light.turnOn()
                if (b.power == 'off') light.turnOff()
                if (b.r && b.g && b.b) light.setColor(b.r, b.g, b.b)
        } catch (err) {
                console.log(err)
        } finally {
                res.end('200')
        }
})

app.get('/', (_, res) => res.sendFile('index.html'))
app.listen(8080, () => console.log('Server is listening on port 8080'))
