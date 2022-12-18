const { stringify, parse: jsonify } = JSON;

// turn string into json SAFELY 
function objify(str) {
    try {
        return jsonify(String(str));
    } catch (e) {
        console.warn(e, str);
        return false;
    }
}
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class button {
    constructor(element, text, color, backColor, startingState, callBack1, callBack2 = () => { }) {
        this.button = element;
        this.text = text;
        this.color = color;
        this.backColor = backColor;
        this.callBack1 = callBack1;
        this.state = startingState;

        this.update = (call1 = true, call2 = false, state_ = this.state) => {
            const { state, button: element, text, color, backColor, callBack1, flick } = this;
            this.state = state_;
            if (call1)
                callBack1(this);
            if (call2)
                callBack2(this);
            var i = this.state ? 1 : 0;
            element.style.backgroundColor = backColor[i];
            element.lastElementChild.textContent = text[i];
            element.lastElementChild.style.color = color[i];
        }
        this.flick = () => {
            this.state = !this.state;
            this.update(true, true);
        }
        this.button.addEventListener('click', this.flick);
    }

}