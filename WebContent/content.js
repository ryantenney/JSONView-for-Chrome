function JSONFormatter() {}

JSONFormatter.prototype = {

	htmlEncode : function(t) {
		return t != null ? t.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace("&amp;hellip;", "&hellip;") : '';
	},

	decorateWithSpan : function(value, className) {
		return '<span class="' + className + '">' + this.htmlEncode(value) + '</span>';
	},

	tag : function(tag, propName, propVal, contents, encode) {
		contents = !contents ? "" : encode ? this.htmlEncode(contents) : contents;
		return '<' + tag + ' ' + propName + '="' + propVal + '">' + contents + '</' + tag + '>';
	},

	relUrl : function (url) {
		var loc = "" + document.location;
		if (loc == url) {
			return "SAME: .";
		} else {
			var i = 0, l = Math.min(loc.length, url.length), mark = 0;
			while (i < l && loc[i] === url[i]) {
				if (loc[i] === "/") mark = i;
				++i;
			}
			if (i == url.length) {
				// up
				return this.abbreviate(url.replace(/^(http|https):\/\/[^\s\/]+/, ""));
			} else if (i == loc.length) {
				// down
				return "." + this.abbreviate(url.slice(mark));
			} else {
				return this.abbreviate(url.replace(/^(http|https):\/\/[^\s\/]+/, ""));
			}
		}
	},

	abbreviate : function (url) {
		return url.replace(/\/(\w{16})\w+\//g, "/$1&hellip;/");
	},

	valueToHTML : function(value) {
		var valueType = typeof value, output = "";
		if (value == null) {
			output += this.decorateWithSpan('null', 'null');
		} else if (value && value.constructor == Array) {
			output += this.arrayToHTML(value);
		} else if (valueType == 'object') {
			switch (type(value)) {
				case "Date":
					output += this.dateToHTML(value);
					break;
				default:
				case "Object":
					output += this.objectToHTML(value);
					break;
			}
		} else if (valueType == 'number') {
			output += this.decorateWithSpan(value, 'num');
		} else if (valueType == 'string') {
			if (/^(http|https):\/\/[^\s]+$/.test(value)) {
				output += '<a href="' + value + '">' + this.htmlEncode(this.relUrl(value)) + '</a>';
			} else {
				output += this.decorateWithSpan('"' + value + '"', 'string');
			}
		} else if (valueType == 'boolean') {
			output += this.decorateWithSpan(value, 'bool');
		}

		return output;
	},

	propertyToHTML : function(prop) {
		output = '<span class="prop">';
		if (/^(http|https):\/\/[^\s]+$/.test(prop)) {
			//output += '<a href="' + prop + '">' + this.htmlEncode(prop) + '</a>';
			output += this.tag("a", "href", prop, prop, true);
		} else {
			output += this.htmlEncode(prop);
		}
		output += '</span>';
		return output;
	},

	arrayToHTML : function(json) {
		var prop, output = '[<ul class="array collapsible">', hasContents = false;
		for (prop in json) {
			hasContents = true;
			output += '<li>';
			output += this.valueToHTML(json[prop]);
			output += '</li>';
		}
		output += '</ul>]';

		if (!hasContents) {
			output = "[ ]";
		}

		return output;
	},

	objectToHTML : function(json) {
		var prop, output = [];
		for (prop in json) {
			output.push(
				this.propertyToHTML(prop) +
				': ' +
				this.valueToHTML(json[prop])
			);
		}

		if (!output.length) {
			output = "{ }";
		} else if (output.length == 1) {
			output = '{ ' + output[0] + ' }';
		} else {
			output = '{<ul class="obj collapsible"><li>' + output.join('</li><li>') + '</li></ul>}';
		}

		return output;
	},

	dateToHTML : function(json) {
		return "<abbr class=\"date\" title=\"" + json.toISOString() + "\">new Date(" + (+json) + ")<\/abbr>";
	},

	jsonToHTML : function(json, fnName) {
		var output = '';
		if (fnName)
			output += '<div class="fn">' + fnName + '(</div>';
		output += '<div id="json">';
		output += this.valueToHTML(json);
		output += '</div>';
		if (fnName)
			output += '<div class="fn">)</div>';
		return output;
	}
};

/**
 * Click handler for collapsing and expanding objects and arrays
 * 
 * @param {Event} evt
 */
function collapse(evt) {
	var ellipsis, collapser = evt.target, target = collapser.parentNode.getElementsByClassName('collapsible')[0];
	if (!target)
		return;

	if (target.style.display == 'none') {
		ellipsis = target.parentNode.getElementsByClassName('ellipsis')[0];
		target.parentNode.removeChild(ellipsis);
		target.style.display = '';
	} else {
		target.style.display = 'none';
		ellipsis = document.createElement('span');
		ellipsis.className = 'ellipsis';
		ellipsis.innerHTML = ' &hellip; ';
		target.parentNode.insertBefore(ellipsis, target);
	}
	collapser.innerHTML = (collapser.innerHTML == '-') ? '+' : '-';
}

function displayObject(jsonText, fnName) {
	var parsedObject, errorBox, closeBox;
	if (!jsonText)
		return;
	try {
		//parsedObject = JSON.parse(jsonText);
		parsedObject = JSONParse_withDates(jsonText);
	} catch (e) {
	}
	document.body.style.fontFamily = "monospace"; // chrome bug : does not work in external CSS stylesheet
	if (!parsedObject) {
		try {
			jsonlint.parse(jsonText);
		} catch (e) {
			document.body.innerHTML += '<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL("content_error.css") + '">';
			errorBox = document.createElement("pre");
			closeBox = document.createElement("div");
			errorBox.className = "error";
			closeBox.className = "close-error";
			closeBox.onclick = function() {
				errorBox.parentElement.removeChild(errorBox);
			};
			errorBox.textContent = e;
			errorBox.appendChild(closeBox);
			setTimeout(function() {
				document.body.appendChild(errorBox);
				errorBox.style.pixelLeft = Math.max(0, Math.floor((window.innerWidth - errorBox.offsetWidth) / 2));
				errorBox.style.pixelTop = Math.max(0, Math.floor((window.innerHeight - errorBox.offsetHeight) / 2));
			}, 100);
		}
		return;
	}
	document.body.innerHTML = '<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL("content.css") + '">'
			+ new JSONFormatter().jsonToHTML(parsedObject, fnName);
	Array.prototype.forEach.call(document.getElementsByClassName('collapsible'), function(childItem) {
		var collapser, item = childItem.parentNode;
		if (item.nodeName == 'LI') {
			collapser = document.createElement('div');
			collapser.className = 'collapser';
			collapser.innerHTML = '-';
			collapser.addEventListener('click', collapse, false);
			item.insertBefore(collapser, item.firstChild);
		}
	});
}

function extractData(text) {
	var tokens;
	if ((text.charAt(0) == "{" || text.charAt(0) == "[") && (text.charAt(text.length - 1) == "}" || text.charAt(text.length - 1) == "]"))
		return {
			text : text
		};
	tokens = text.match(/^([^\s\(]*)\s*\(\s*([\[{].*[\]}])\s*\)(?:\s*;?)*\s*$/);
	if (tokens && tokens[1] && tokens[2])
		return {
			fnName : tokens[1],
			text : tokens[2]
		};
}

function processData(data, options) {
	var xhr;
	if (options.safeMethod) {
		xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (this.readyState == 4) {
				data = extractData(this.responseText);
				if (data)
					displayObject(data.text, data.fnName);
			}
		};
		xhr.open("GET", document.location.href, true);
		xhr.send(null);
	} else if (data)
		displayObject(data.text, data.fnName);
}

function init(data) {
	var port = chrome.extension.connect();
	port.onMessage.addListener(function(msg) {
		if (msg.init)
			processData(data, msg.options);
	});
	port.postMessage({
		init : true
	});
}

function load() {
	var child, data;
	if (document.body && document.body.childNodes[0] && document.body.childNodes[0].tagName == "PRE" || document.body.children.length == 0) {
		child = document.body.children.length ? document.body.childNodes[0] : document.body;
		data = extractData(child.innerText.trim());
		if (data)
			init(data);
	}
}

load();

function JSONParse_withDates(str) {
	if (/new Date\(\d+\)/.test(str)) {
		str = fixJSONString(sanitizeDates(str));
		var obj = JSON.parse(str);
		return interpretDates(obj);
	} else {
		return JSON.parse(str);
	}
}

// Turn ons: Acyclic graphs.
// Turn offs: Turn offs: Turn offs: Turn offs: Turn offs: ...
function walk(object, visitor, context, key, parent) {
	switch (type(object)) {
		case "Object":
			for (var key in object) {
				if (object.hasOwnProperty(key)) {
					walk(object[key], visitor, context, key, object);
				}
			}
			break;
		case "Array":
			object.forEach(function (value, key, object) {
				walk(value, visitor, this, key, object);
			}, context);
			break;
		default:
			visitor.call(context, object, key, parent);
	}
}

function sanitizeDates(str) {
	return str.replace(/(new Date\(\d+\))/g, "\"#####$1#####\"");
}

function fixJSONString(str) {
	return str.replace(/([\r\n\{,:]?)(['"]?)(\w*)(['"]?)([\r\n\{,:]?)/g, function($0, $1, $2, $3, $4, $5) {
		if ($2 == $4 && ($1 || $5 || $0 == "''")) {
			var val = +$3;
			if ($2 == "'" || ($2 == "" && $3 != "" && !(val == $3 || $3 == "NaN" || val == Infinity || val == -Infinity))) {
				$2 = $4 = "\"";
			}
		}
		return $1 + $2 + $3 + $4 + $5;
	});
}

function interpretDates(object) {
	walk(object, function (value, key, object) {
		if (type(value) === "String") {
			var m = /^#{5}new Date\((\d+)\)#{5}$/.exec(value);
			if (m) {
				object[key] = new Date(parseInt(m[1], 10));
			}
		}
	});
	return object;
}

function type(o) {
	return Object.prototype.toString.call(o).replace(/^\[object (\w+)\]$/, "$1");
}