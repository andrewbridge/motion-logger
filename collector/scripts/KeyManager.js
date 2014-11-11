/**
 * KeyManager
 *
 * Fires off custom events when specific keys are pressed.
 *
 * @compatibility CustomEvent is relatively new, and may not have full or uniform compatiblity across
 *				 browsers.
 *
 * @method init Starts listening for to key presses, then destroys itself to protect against
 *			   echoing (double listen triggers).
 * @method listener When fired, listener checks whether the key has an entry in the eventDefinition object
 *				   and, if it does, will fire the custom event on the correct element if all conditions are
 *				   met.
 *		@param e An event object, usually from an event listener trigger.
 *		@return Returns true unless the custom event wishes to block default actions from that keypress.
 * @method updateStateInfo Updates the keysPressed array when a key is pressed or released.
 *		@param e An event object, the method will only react to keyup or keydown events.
 * @method isPressed Determines whether or not a key is currently pressed or not.
 *		@param keyCode The numerical key code or key name to determine the state of.
 *		@return A boolean represeting whether or not the key is pressed.
 * @method changeTabNav Changes the element(s) place in the tab order.
 *		@param elms An HTMLElement or an array of HTMLElement objects to be changed from the tab order.
 *		@return Returns true unless elms did not contain at least one HTMLElement, in which case false is returned.
 * @method addTabNav Adds the element(s) from the tab order.
 *		@param elms An HTMLElement or an array of HTMLElement objects to be added from the tab order.
 *		@return Returns true unless elms did not contain at least one HTMLElement, in which case false is returned.
 * @method removeTabNav Removes the element(s) from the tab order.
 *		@param elms An HTMLElement or an array of HTMLElement objects to be removed from the tab order.
 *		@return Returns true unless elms did not contain at least one HTMLElement, in which case false is returned.
 * @property eventDefinitions The object which contains information about the custom events which should
 *							 be fired on specific key presses.
 *		@key The keyCode to fire the event on.
 *		@value An object containing the parameters of that custom event. Note that all of these parameters
 *			   are required.
 *			@param onlyFocusable A boolean which dictates whether the event is only fired when the active
 *								 element is focusable (i.e. can be tabbed to).
 *			@param eventName The name of the custom event.
 *			@param triggerOn A string defining which element to trigger the event on. Currently it only
 *							 recognises "document", the event is fired on the document object, and
 *							 "active", the event is fired on the currently active element.
 *			@param blockDefaults A boolean which dictates whether the default action of the key press
 *								 (such as printing a key or submitting a form) will be allowed.
 * @property keyMappings The object which contains key names to key codes.
 * @property keysPressed An array of codes of all the keys currently pressed.
 */
KeyManager = {
    init: function() {
        document.addEventListener("keydown", this.listener.bind(this), true);
        document.addEventListener("keyup", this.updateStateInfo.bind(this), true);
        this.init = undefined;
    },
    listener: function(e) {
        this.updateStateInfo(e);
        var elm = document.activeElement;
        var elmType = elm.nodeName.toLowerCase();
        var focusable = (elmType == "select" || elmType == "input" || elmType == "textarea" || elm.tabIndex > -1);
        if (e.keyCode in this.eventDefinitions) {
            if ((this.eventDefinitions[e.keyCode].onlyFocusable && focusable) ||
                !this.eventDefinitions[e.keyCode].onlyFocusable) {
                if (this.eventDefinitions[e.keyCode].blockDefaults) {e.preventDefault(); e.stopPropagation();}
                var dispatchOn = (this.eventDefinitions[e.keyCode].triggerOn == "active") ? elm : document;
                dispatchOn.dispatchEvent(new CustomEvent(this.eventDefinitions[e.keyCode].eventName,
                    {bubbles: true, cancelable: true}));
                return !this.eventDefinitions[e.keyCode].blockDefaults;
            }
        }

        return true;
    },
    updateStateInfo: function(e) {
        if (e.type == "keyup" && this.keysPressed.indexOf(e.keyCode) != -1) {
            delete this.keysPressed[this.keysPressed.indexOf(e.keyCode)];
        } else if (e.type == "keydown" && !this.isPressed(e.keyCode)) {
            this.keysPressed.push(e.keyCode);
        }
    },
    isPressed: function(keyCode) {
        keyCode = (typeof keyCode == "string" && keyCode in this.keyMappings) ? this.keyMappings[keyCode] : keyCode;
        return (this.keysPressed.indexOf(keyCode) != -1);
    },
    changeTabNav: function(elms, val) {
        var result = false;
        if (elms instanceof HTMLElement) {
            elms = [elms];
        }

        if (typeof elms == "object" && elms.length > 0) {
            for (var i = 0; i < elms.length; i++) {
                if (elms[i] instanceof HTMLElement && "tabIndex" in elms[i]) {
                    result = true;
                    elms[i].tabIndex = val;
                }
            }
        }

        return result;
    },
    addTabNav: function(elms) {
        return this.changeTabNav(elms, 0);
    },
    removeTabNav: function(elms) {
        return this.changeTabNav(elms, -1);
    },
    eventDefinitions: {
        8: {onlyFocusable: true, eventName: "backspacepress", triggerOn: "active", blockDefaults: false},
        9: {onlyFocusable: true, eventName: "tabpress", triggerOn: "active", blockDefaults: true},
        13: {onlyFocusable: true, eventName: "enterpress", triggerOn: "active", blockDefaults: false},
        27: {onlyFocusable: false, eventName: "escapepress", triggerOn: "document", blockDefaults: false},
        32: {onlyFocusable: true, eventName: "spacepress", triggerOn: "active", blockDefaults: false}
    },
    keyMappings: {
        "enter": 13, "escape": 27, "shift": 16, "ctrl": 17, "control": 17, "alt": 18, "tab": 9, "backspace": 8
    },
    keysPressed: []
}

KeyManager.init();