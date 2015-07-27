function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function formatString(string, arguments) {
  // formats string using an object
  // formatString("hi {name}!", {name: "kiwi"}) -> "hi kiwi!"
  var type = typeof arguments[0];

  for (var r in arguments) {
    string = string.replace(new RegExp("\\{" + r + "\\}", "gi"), arguments[r]);
  }

  return string;
}

module.exports = {
  getParameterByName: getParameterByName,
  formatString: formatString
};
