const {
        Control
} = require('magic-home')
var express = require('express')
var app = express()
app.use(express.static('public'))

var light = new Control("192.168.1.154")

app.get('/set', (req, res) => {
        if (!light) return
        const q = req.query
        try {
                if (q.power == 'on') light.turnOn()
                if (q.power == 'off') light.turnOff()
                if (q.r && q.g && q.b) light.setColor(q.r, q.g, q.b)
        } catch (err) {
                console.log(err)
        } finally {
                res.redirect('/')
        }
})

app.get('/', (req, res) => {
        res.sendFile('index.html')
})

let server = app.listen(8080, function() {
        console.log('Server is listening on port 8080')
});
