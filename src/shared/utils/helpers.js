const CONSTANTS = require("../constants/constants");

function generateOTP(length = CONSTANTS.OTP_LENGTH) {
    var key = "";
    var possible = "0123456789";
    for (var i = 0; i < length; i++) {
        key += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return key;
}
module.exports = { generateOTP }