/*!
* Aloha Editor
* Author & Copyright (c) 2010 IKS
* jerry.jalava@infigo.fi
* Licensed under the terms of http://www.aloha-editor.com/license.html
*/
if (typeof eu == 'undefined' || !eu) {
	var eu = {};
}

if (typeof eu.iksproject == 'undefined' || !eu.iksproject) {
	eu.iksproject = {};
}

if (typeof eu.iksproject.Utils == 'undefined' || !eu.iksproject.Utils) {
	eu.iksproject.Utils = {};
}

if (typeof eu.iksproject.Utils.RDFa == 'undefined' || !eu.iksproject.Utils.RDFa) {
	/**
	 * @namespace eu.iksproject.Utils
	 * @class RDFa provides methods to get information about RDFa in DOM and to manipulate it
	 * @singleton
	 */
	eu.iksproject.Utils.RDFa = function () {};
}

eu.iksproject.Utils.RDFa.prototype.namespaceHandlers = {};

/**
 * Plugins should register all RFDa namespaces and its classes that they support.
 *
 * @param {String} pluginName Name of the plugin
 * @param {String} namespace Namespace which the plugin can handle
 * @param {Array} classes List of classes from the namespace which the plugin can handle
 */
eu.iksproject.Utils.RDFa.prototype.registerNamespaceHandler = function(pluginName, namespace, classes) {
    if (typeof this.namespaceHandlers[namespace] == 'undefined') {
        this.namespaceHandlers[namespace] = {};
    }
    
    if (! (classes instanceof Array)) {
        classes = [classes];
    }
    
    for (var i=0; i<classes.length; i++) {
        this.namespaceHandlers[namespace][classes[i]] = pluginName;
    }
};

/**
 * Returns assocative array of all the classes and their handler plugin names
 * that have been registered.
 *
 * @param {String} namespace Namespace
 */
eu.iksproject.Utils.RDFa.prototype.getClassesForNamespace = function(namespace) {
    if (typeof this.namespaceHandlers[namespace] == 'undefined') {
        return false;
    }
    
    return this.namespaceHandlers[namespace];
};

/**
 * Returns plugin instance by the given namespace and classname.
 *
 * @param {String} namespace Namespace
 * @param {String} className Name of the class
 * @return {Plugin} instance of the registered plugin
 */
eu.iksproject.Utils.RDFa.prototype.getHandlerForClass = function(namespace, className) {
    if (typeof this.namespaceHandlers[namespace] == 'undefined') {
        return false;
    }
    
    return GENTICS.Aloha.PluginRegistry.getInstance(this.namespaceHandlers[namespace][className]);
};

/**
 * Element representing RDFa object
 *
 * @class
 * @param {String} namespace Namespace
 * @param {String} className Name of the class
 * @param {Object} opts Overriding options
 */
eu.iksproject.Utils.RDFa.prototype.Element = function (namespace, className, opts) {
    this.options = jQuery.extend({}, {
        'shortHandle': namespace + '_NS',
        'elementName': 'span'
    }, opts || {});
    this.properties = {};
    
    this.namespace = namespace;
    this.classname = className;
    this.nsPrefix = 'xmlns:' + this.options.shortHandle;
    this.shortHandlePrefix = this.options.shortHandle + ':';
    
    this.createElement(true);
};

eu.iksproject.Utils.RDFa.prototype.Element.prototype.createElement = function(withoutChildren) {
    if (typeof withoutChildren == "undefined") {
        withoutChildren = false;
    }
    
    this.element = jQuery('<' + this.options.elementName + '/>');
    
    this.attrs = {};
    this.attrs[this.nsPrefix] = this.namespace;
    this.attrs['typeof'] = this.shortHandlePrefix + this.classname;
    
    this.element.attr(this.attrs);
    
    if (! withoutChildren) {
        var self = this;
        jQuery.each(this.properties, function(name, property) {
            self.properties[name].createElement();
        });
    }
};

eu.iksproject.Utils.RDFa.prototype.Element.prototype.getElement = function(withoutChildren) {
    if (typeof withoutChildren == "undefined") {
        withoutChildren = false;
    }
    
    this.createElement(withoutChildren);
    
    var rootElement = this.element;
    
    if (withoutChildren) {
        return rootElement;
    }
    
    var self = this;
    jQuery.each(this.properties, function(name, property) {
        self.properties[name].element.appendTo(rootElement);
    });
    
    return rootElement;
};

eu.iksproject.Utils.RDFa.prototype.Element.prototype.addProperty = function(propertyName, value, opts) {
    if (typeof this.properties[propertyName] != "undefined") {
        this.properties[propertyName].update(value, opts);
        
        return;
    }
    
    this.properties[propertyName] = new eu.iksproject.Utils.RDFa.ElementProperty(this, propertyName, value, opts);
};

eu.iksproject.Utils.RDFa.prototype.Element.prototype.getProperty = function(propertyName) {
    if (typeof this.properties[propertyName] == "undefined") {        
        return;
    }
    
    return this.properties[propertyName];
};

/**
 * ElementProperty representing RDFa object property
 *
 * @class
 * @param {eu.iksproject.Utils.RDFa.Element} parentElement Element that this property belongs to
 * @param {String} propertyName Name of the property
 * @param {Mixed} value Value of the property
 * @param {Object} opts Overriding options
 */
eu.iksproject.Utils.RDFa.prototype.ElementProperty = function(parentElement, propertyName, value, opts) {
    this.options = jQuery.extend({}, {
        'elementName': 'span',
        'visible': true,
        'namespace': null,
    }, opts || {});
    
    if (this.options.namespace != null && typeof this.options.shortHandle == "undefined") {
        this.options.shortHandle = this.options.namespace + '_NS';
    }
    
    this.parent = parentElement;
    this.name = propertyName;
    this.value = value;
    
    this.createElement();
};

eu.iksproject.Utils.RDFa.prototype.ElementProperty.prototype.update = function(value, opts) {
    this.options = jQuery.extend(this.options, opts || {});
    this.value = value;
    
    this.createElement();
};

eu.iksproject.Utils.RDFa.prototype.ElementProperty.prototype.createElement = function() {
    this.element = jQuery('<' + this.options.elementName + '/>');
    
    this.attrs = {};
    
    var shorthandlePrefix = this.parent.shortHandlePrefix;
    
    if (this.options.namespace != null) {
        if (typeof this.options.shortHandle != "undefined") {
            shortHandlePrefix = this.options.shortHandle;
        }
        
        this.attrs['xmlns:' + shortHandlePrefix] = this.options.namespace;
    }
    
    this.attrs['property'] = shorthandlePrefix + this.name;
    
    if (!this.options.visible || typeof this.value == "undefined") {
        this.attrs['content'] = this.value;
        
        if (typeof this.value == "undefined") {
            this.attrs['content'] = '';
        }
    } else {
        if (typeof this.value != "undefined") {
            this.element.html(this.value);
        }
    }
    
    this.element.attr(this.attrs);
};

eu.iksproject.Utils.RDFa.prototype.ElementProperty.prototype.getElement = function() {
    return this.element;
};

eu.iksproject.Utils.RDFa.prototype.ElementProperty.prototype.getElementTree = function() {
    var tree = this.parent.getElement();
    
    this.element.appendTo(tree);
    
    return tree;
};

/**
 * Create the singleton object
 * @hide
 */
eu.iksproject.Utils.RDFa = new eu.iksproject.Utils.RDFa();