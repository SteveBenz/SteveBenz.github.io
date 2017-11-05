;
var Greeter = (function () {
    function Greeter(element) {
    }
    Greeter.prototype.timerCallback = function () {
        var diagnostics = document.getElementById('diagnostics');
        var newText = diagnostics.value;
        if (newText === this.lastDiagnosticBlock) {
            return;
        }
        var myContent = document.getElementById('mycontent');
        var regexData = newText.match(/^{([a-f0-9]+)\:([a-f0-9]*)}$/i);
        if (regexData == null) {
            var helpText = document.createElement('div');
            helpText.className = 'helpText';
            helpText.innerText = "Click in the text box and press Scroll-lock";
            myContent.innerHTML = helpText.outerHTML;
        }
        else {
            var errorFlags = parseInt(regexData[1], 16);
            var bytes = regexData[2];
            var a = new Uint8Array((bytes.length) / 2);
            for (var i = 0; i < bytes.length; i += 2) {
                a[i / 2] = parseInt(bytes.substring(i, i + 2), 16);
            }
            var div = document.createElement('div');
            if (errorFlags == 0) {
                var noErrors = document.createElement('div');
                noErrors.className = 'noErrors';
                noErrors.innerText = 'No errors were recorded';
                div.appendChild(noErrors);
            }
            else {
                var errors = document.createElement('div');
                errors.className = 'errors';
                var errorText = '';
                for (var i = 0; i < 16; ++i) {
                    if (errorFlags & (1 << i)) {
                        if (errorText != '') {
                            errorText += ' | ';
                        }
                        errorText += this.opcodeToName(i).name;
                    }
                }
                errors.innerText = errorText;
                div.appendChild(errors);
            }
            var i = a.length - 1;
            while (i > 0) {
                var opCode = a[i] >> 2;
                var numArguments = a[i] & 3;
                if (i - numArguments < 0) {
                    break;
                }
                var arg1 = numArguments >= 1 ? a[i - 1] : -1;
                var arg2 = numArguments >= 2 ? a[i - 2] : -1;
                var arg3 = numArguments >= 3 ? a[i - 3] : -1;
                i -= 1 + numArguments;
                var content = this.translatePhrase(opCode, numArguments, arg1, arg2, arg3);
                div.appendChild(content);
            }
            document.getElementById('mycontent').innerHTML = div.outerHTML;
        }
        this.lastDiagnosticBlock = newText;
    };
    Greeter.prototype.translatePhrase = function (opcode, numArguments, arg1, arg2, arg3) {
        var elementDiv = document.createElement('div');
        var opCodeTranslation = this.opcodeToName(opcode);
        if (opCodeTranslation.classPicker) {
            elementDiv.className = opCodeTranslation.classPicker(numArguments, arg1, arg2, arg3);
        }
        else if (opcode < 16) {
            elementDiv.className = 'error';
        }
        else {
            elementDiv.className = 'info';
        }
        var content = opCodeTranslation.name + "(";
        if (opCodeTranslation.fullTranslator) {
            content += opCodeTranslation.fullTranslator(numArguments, arg1, arg2, arg3);
        }
        else if (opCodeTranslation.translator) {
            if (arg1 >= 0) {
                content += opCodeTranslation.translator(arg1);
            }
            if (arg2 >= 0) {
                content += ',' + opCodeTranslation.translator(arg2);
            }
            if (arg3 >= 0) {
                content += ',' + opCodeTranslation.translator(arg3);
            }
        }
        else {
            if (arg1 >= 0) {
                content += arg1.toString();
            }
            if (arg2 >= 0) {
                content += ',' + arg2.toString();
            }
            if (arg3 >= 0) {
                content += ',' + arg3.toString();
            }
        }
        content += ')';
        elementDiv.innerHTML = content;
        return elementDiv;
    };
    Greeter.prototype.opcodeToName = function (opcode) {
        switch (opcode) {
            case 0: return { name: 'ps2:packetDidNotStartWithZero' };
            case 1: return { name: 'ps2:parityError' };
            case 2: return { name: 'ps2:packetDidNotEndWithOne' };
            case 3: return { name: 'ps2:packetIncomplete' };
            case 4: return { name: 'ps2:sendFrameError' };
            case 5: return { name: 'ps2:bufferOverflow' };
            case 6: return { name: 'ps2:incorrectResponse', translator: this.ps2CodeToString };
            case 7: return { name: 'ps2:noResponse', translator: this.ps2CodeToString };
            case 8: return { name: 'ps2:noTranslationForKey', translator: this.ps2CodeToString };
            case 9: return { name: 'ps2:startupFailure' };
            case 16: return { name: 'ps2:sentByte', translator: this.ps2CommandToString };
            case 17: return { name: 'ps2:receivedByte', translator: this.ps2CodeToString };
            case 18: return { name: 'diag:pause', fullTranslator: this.shortPauseArg, classPicker: this.pauseClassPicker };
            case 22: return { name: 'usb:sentUsbKeyDown', translator: this.usbScanCodeToString };
            case 23: return { name: 'usb:sentUsbKeyUp', translator: this.usbScanCodeToString };
            default: return { name: '?' + opcode.toString() + '?' };
        }
    };
    Greeter.prototype.pauseClassPicker = function (numBytes, time1, time2) {
        if (numBytes == 1 && time1 == 1) {
            return "tinyPause";
        }
        else if (numBytes == 1) {
            return "smallPause";
        }
        else {
            return "bigPause";
        }
    };
    Greeter.prototype.shortPauseArg = function (numBytes, time1, time2) {
        if (numBytes == 1) {
            return (time1 * 8).toString() + "ms";
        }
        else {
            return (((time1 * 256 + time2) * 64) / 1000).toString() + "sec";
        }
    };
    ;
    Greeter.prototype.ps2CommandToString = function (command) {
        switch (command) {
            case 0xff: return "reset";
            case 0xfe: return "resend";
            case 0xfd: return "disableBreakAndTypematicForSpecificKeys";
            case 0xfc: return "disableTypematicForSpecificKeys";
            case 0xfb: return "disableBreaksForSpecificKeys";
            case 0xfa: return "enableBreakAndTypeMaticForAllKeys";
            case 0xf9: return "disableBreakAndTypematicForAllKeys";
            case 0xf8: return "disableTypematicForAllKeys";
            case 0xf7: return "disableBreaksForAllKeys";
            case 0xf6: return "useDefaultSettings";
            case 0xf5: return "disable";
            case 0xf4: return "enable";
            case 0xf3: return "setTypematicRate";
            case 0xf2: return "readId";
            case 0xf0: return "setScanCodeSet";
            case 0xee: return "echo";
            case 0xed: return "setLeds";
            default: return "?" + command.toString() + "?";
        }
    };
    Greeter.prototype.usbScanCodeToString = function (scancode) {
        // http://www.mindrunway.ru/IgorPlHex/USBKeyScan.pdf
        // More authoritative sources were far harder to untangle.
        switch (scancode) {
            case 0x20: return '# 3';
            case 0x40: return 'F7';
            case 0x61: return '9 PgUp KP';
            case 0x21: return '$ 4';
            case 0x41: return 'F8';
            case 0x62: return '0 Ins KP';
            case 0x22: return '% 5';
            case 0x42: return 'F9';
            case 0x63: return '. Del KP';
            case 0x23: return '^ 6';
            case 0x43: return 'F10';
            case 0x64: return '(INT 1)';
            case 0x04: return 'A';
            case 0x24: return '& 7';
            case 0x44: return 'F11';
            case 0x65: return 'WinMenu';
            case 0x05: return 'B';
            case 0x25: return '* 8';
            case 0x45: return 'F12';
            case 0x68: return 'F13';
            case 0x06: return 'C';
            case 0x26: return '( 9';
            case 0x46: return 'PrtSc';
            case 0x69: return 'F14';
            case 0x07: return 'D';
            case 0x27: return ') 0';
            case 0x47: return 'Scroll Lock';
            case 0x6A: return 'F15';
            case 0x08: return 'E';
            case 0x28: return 'Enter';
            case 0x48: return 'Pause/Bk';
            case 0x6B: return 'F16';
            case 0x09: return 'F';
            case 0x29: return 'Esc';
            case 0x49: return 'Ins CP';
            case 0x6C: return 'F17';
            case 0x0A: return 'G';
            case 0x2A: return 'Back Space';
            case 0x4A: return 'Home CP';
            case 0x6D: return 'F18';
            case 0x0B: return 'H';
            case 0x2B: return 'Tab';
            case 0x4B: return 'PgUp CP';
            case 0x6E: return 'F19';
            case 0x0C: return 'I';
            case 0x2C: return 'Space';
            case 0x4C: return 'Del CP';
            case 0x6F: return 'F20';
            case 0x0D: return 'J';
            case 0x2D: return '_ -';
            case 0x4D: return 'End CP';
            case 0x70: return 'F21';
            case 0x0E: return 'K';
            case 0x2E: return '+ =';
            case 0x4E: return 'PgDn CP';
            case 0x71: return 'F22';
            case 0x0F: return 'L';
            case 0x2F: return '{ [';
            case 0x4F: return 'Right CP';
            case 0x72: return 'F23';
            case 0x10: return 'M';
            case 0x30: return '} ]';
            case 0x50: return 'Left CP';
            case 0x73: return 'F24';
            case 0x11: return 'N';
            case 0x31: return '| \\';
            case 0x51: return 'Down CP';
            case 0x75: return 'Help';
            case 0x12: return 'O';
            case 0x32: return '(INT 2)';
            case 0x52: return 'Up CP';
            case 0x7A: return 'Undo';
            case 0x13: return 'P';
            case 0x33: return ': ;';
            case 0x53: return 'Num Lock';
            case 0x7B: return 'Cut';
            case 0x14: return 'Q';
            case 0x34: return '" ,';
            case 0x54: return '/ KP';
            case 0x7C: return 'Copy';
            case 0x15: return 'R';
            case 0x35: return '~ `';
            case 0x55: return '* KP';
            case 0x7D: return 'Paste';
            case 0x16: return 'S';
            case 0x36: return '< ,';
            case 0x56: return '- KP';
            case 0x7F: return 'Mute';
            case 0x17: return 'T';
            case 0x37: return '> .';
            case 0x57: return '+ KP';
            case 0x18: return 'U';
            case 0x38: return '? /';
            case 0x58: return 'Enter KP';
            case 0x80: return 'VolumeUp';
            case 0x19: return 'V';
            case 0x39: return 'Caps Lock';
            case 0x59: return '1 End KP';
            case 0x81: return 'VolumeDown';
            case 0x1A: return 'W';
            case 0x3A: return 'F1';
            case 0x5A: return '2 Down KP';
            case 0x87: return '(INT 3)';
            case 0x1B: return 'X';
            case 0x3B: return 'F2';
            case 0x5B: return '3 PgDn KP';
            case 0x88: return 'katakana';
            case 0x1C: return 'Y';
            case 0x3C: return 'F3';
            case 0x5C: return '4 Left KP';
            case 0x89: return '(INT 4)';
            case 0x1D: return 'Z';
            case 0x3D: return 'F4';
            case 0x5E: return '6 Right KP';
            case 0x8A: return 'kanji';
            case 0x1E: return '! 1';
            case 0x3E: return 'F5';
            case 0x5F: return '7 Home KP';
            case 0x8B: return 'hiragana';
            case 0x1F: return '@ 2';
            case 0x3F: return 'F6';
            case 0x60: return '8 Up KP';
            case 0x8C: return 'furigana';
            case 0x97: return '5 KP ';
            case 0xE0: return 'Left Ctrl';
            case 0x9A: return 'Attn / SysRq ';
            case 0xE1: return 'Left Shift';
            case 0x9C: return 'Clear';
            case 0xE2: return 'Left Alt';
            case 0xA3: return 'CrSel';
            case 0xE3: return 'Left Win';
            case 0xA4: return 'ExSel / SetUp ';
            case 0xE4: return 'Right Ctrl';
            case 0xE5: return 'Right Shift';
            case 0xE6: return 'Right Alt';
            case 0xE7: return 'Right Win';
            default: return "?" + scancode.toString() + "?";
        }
    };
    Greeter.prototype.ps2CodeToString = function (scancode) {
        switch (scancode) {
            case 0x0: return "none";
            case 0xfe: return "garbled";
            case 0xaa: return "batSuccessful";
            case 0xfc: return "batFailure";
            case 0xfa: return "ack";
            case 0xee: return "echo";
            case 0xfe: return "nack";
            case 0xf0: return "unmake";
            case 0xe0: return "extend";
            case 0xe1: return "extend1";
            case 0x77: return "sc2_numLock";
            case 0x7e: return "sc2_scrollLock";
            case 0x58: return "sc2_capsLock";
            case 0x12: return "sc2_leftShift";
            case 0x59: return "sc2_rightShift";
            case 0x14: return "sc2_leftCtrl";
            case 0x11: return "sc2_leftAlt";
            case 0x84: return "sc2_sysRequest";
            case 0x76: return "sc2_esc";
            case 0x66: return "sc2_backspace";
            case 0x0d: return "sc2_tab";
            case 0x5a: return "sc2_enter";
            case 0x29: return "sc2_space";
            case 0x70: return "sc2_keypad0";
            case 0x69: return "sc2_keypad1";
            case 0x72: return "sc2_keypad2";
            case 0x7a: return "sc2_keypad3";
            case 0x6b: return "sc2_keypad4";
            case 0x73: return "sc2_keypad5";
            case 0x74: return "sc2_keypad6";
            case 0x6c: return "sc2_keypad7";
            case 0x75: return "sc2_keypad8";
            case 0x7d: return "sc2_keypad9";
            case 0x71: return "sc2_keypadPeriod";
            case 0x79: return "sc2_keypadPlus";
            case 0x7b: return "sc2_keypadDash";
            case 0x7c: return "sc2_keypadAsterisk";
            case 0x5a: return "sc2ex_keypadEnter";
            case 0x0f: return "sc2_KeypadEquals";
            case 0x6d: return "sc2_keypadComma";
            case 0x4a: return "sc2ex_keypadForwardSlash";
            case 0x45: return "sc2_0";
            case 0x16: return "sc2_1";
            case 0x1e: return "sc2_2";
            case 0x26: return "sc2_3";
            case 0x25: return "sc2_4";
            case 0x2e: return "sc2_5";
            case 0x36: return "sc2_6";
            case 0x3d: return "sc2_7";
            case 0x3e: return "sc2_8";
            case 0x46: return "sc2_9";
            case 0x52: return "sc2_apostrophe";
            case 0x41: return "sc2_comma";
            case 0x4e: return "sc2_dash";
            case 0x49: return "sc2_period";
            case 0x4a: return "sc2_forwardSlash";
            case 0x0e: return "sc2_openQuote";
            case 0x1c: return "sc2_a";
            case 0x32: return "sc2_b";
            case 0x21: return "sc2_c";
            case 0x23: return "sc2_d";
            case 0x24: return "sc2_e";
            case 0x2b: return "sc2_f";
            case 0x34: return "sc2_g";
            case 0x33: return "sc2_h";
            case 0x43: return "sc2_i";
            case 0x3b: return "sc2_j";
            case 0x42: return "sc2_k";
            case 0x4b: return "sc2_l";
            case 0x3a: return "sc2_m";
            case 0x31: return "sc2_n";
            case 0x44: return "sc2_o";
            case 0x4d: return "sc2_p";
            case 0x15: return "sc2_q";
            case 0x2d: return "sc2_r";
            case 0x1b: return "sc2_s";
            case 0x2c: return "sc2_t";
            case 0x3c: return "sc2_u";
            case 0x2a: return "sc2_v";
            case 0x1d: return "sc2_w";
            case 0x22: return "sc2_x";
            case 0x35: return "sc2_y";
            case 0x1a: return "sc2_z";
            case 0x4c: return "sc2_semicolon";
            case 0x5d: return "sc2_backslash";
            case 0x61: return "sc2_europe2";
            case 0x54: return "sc2_openSquareBracket";
            case 0x5b: return "sc2_closeSquareBracket";
            case 0x55: return "sc2_equal";
            case 0x05: return "sc2_f1";
            case 0x06: return "sc2_f2";
            case 0x04: return "sc2_f3";
            case 0x0c: return "sc2_f4";
            case 0x03: return "sc2_f5";
            case 0x0b: return "sc2_f6";
            case 0x83: return "sc2_f7";
            case 0x0a: return "sc2_f8";
            case 0x01: return "sc2_f9";
            case 0x09: return "sc2_f10";
            case 0x78: return "sc2_f11";
            case 0x07: return "sc2_f12";
            case 0x08: return "sc2_f13";
            case 0x10: return "sc2_f14";
            case 0x18: return "sc2_f15";
            case 0x20: return "sc2_f16";
            case 0x28: return "sc2_f17";
            case 0x30: return "sc2_f18";
            case 0x38: return "sc2_f19";
            case 0x40: return "sc2_f20";
            case 0x48: return "sc2_f21";
            case 0x50: return "sc2_f22";
            case 0x57: return "sc2_f23";
            case 0x5f: return "sc2_f24";
            case 0x51: return "sc2_intl1";
            case 0x13: return "sc2_intl2";
            case 0x6a: return "sc2_intl3";
            case 0x64: return "sc2_intl4";
            case 0x67: return "sc2_intl5";
            case 0xF2: return "sc2_lang1";
            case 0xF1: return "sc2_lang2";
            case 0x63: return "sc2_lang3";
            case 0x62: return "sc2_lang4";
            case 0x5f: return "sc2_lang5";
            case 0x14: return "sc2ex_rightCtrl";
            case 0x11: return "sc2ex_rightAlt";
            case 0x1f: return "sc2ex_leftGui";
            case 0x1f: return "sc2ex_leftWindows";
            case 0x27: return "sc2ex_rightGui";
            case 0x27: return "sc2ex_rightWindows";
            case 0x7c: return "sc2ex_printScreen";
            case 0x2f: return "sc2ex_menu";
            case 0x6c: return "sc2ex_home";
            case 0x69: return "sc2ex_end";
            case 0x7d: return "sc2ex_pageUp";
            case 0x7a: return "sc2ex_pageDown";
            case 0x6b: return "sc2ex_leftArrow";
            case 0x74: return "sc2ex_rightArrow";
            case 0x75: return "sc2ex_upArrow";
            case 0x72: return "sc2ex_downArrow";
            case 0x70: return "sc2ex_insert";
            case 0x71: return "sc2ex_delete";
            case 0x4d: return "sc2ex_nextTrack";
            case 0x15: return "sc2ex_prevTrack";
            case 0x3b: return "sc2ex_stop";
            case 0x34: return "sc2ex_play";
            case 0x23: return "sc2ex_mute";
            case 0x32: return "sc2ex_volumeUp";
            case 0x21: return "sc2ex_volumeDown";
            case 0x50: return "sc2ex_mediaSelect";
            case 0x48: return "sc2ex_email";
            case 0x2b: return "sc2ex_calculator";
            case 0x40: return "sc2ex_myComputer";
            case 0x10: return "sc2ex_webSearch";
            case 0x3a: return "sc2ex_webHome";
            case 0x38: return "sc2ex_webBack";
            case 0x30: return "sc2ex_webForward";
            case 0x28: return "sc2ex_webStop";
            case 0x20: return "sc2ex_webRefresh";
            case 0x18: return "sc2ex_webFavorites";
            case 0x37: return "sc2ex_power";
            case 0x3f: return "sc2ex_sleep";
            case 0X5e: return "sc2ex_wake";
            default: return "?" + scancode.toString() + "?";
        }
    };
    Greeter.prototype.start = function () {
        var _this = this;
        this.timerToken = setInterval(function () { return _this.timerCallback(); }, 500);
    };
    Greeter.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    return Greeter;
})();
window.onload = function () {
    var el = document.getElementById('content');
    var text = document.getElementById('diagnostics');
    var greeter = new Greeter(el);
    greeter.start();
};
//# sourceMappingURL=app.js.map