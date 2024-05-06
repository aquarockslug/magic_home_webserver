var express = require('express')
var app = express()

app.get('/on', (req, res) => res.send("power on"))
app.get('/off', (req, res) => res.send("power off"))
app.get('/set', (req, res) => {
        let color = {
                r: req.query.r,
                g: req.query.g,
                b: req.query.b
        }
        // set magic-home color
        res.send(color)
})

app.get('/', (req, res) => {

        // powerHandler = () => window.location.replace("http://localhost:8080/on") 

        res.send(`
<button onclick=window.location.replace("http://localhost:8080/on")> POWER </button>
<label for="panelPicker"></label>
<div class="color-picker">
  <input
    id="panelPicker"
    name="panelPicker"
    data-function="color-picker"
    data-format="hex"
    data-color-presets="red,green,blue"
    class="color-preview"
    value="#069"
  />
</div>
	`)
})

let server = app.listen(8080, function() {
        console.log('Server is listening on port 8080')
});
