/*global Aloha:true, module:true, test:true, deepEqual:true */
Aloha.ready(function () {
	Aloha.require(['ui/settings', 'ui/ui', 'ui/ui-plugin'], function (Settings, Ui, UiPlugin) {
	'use strict';

		module('Settings');
		test('combine user and default settings', function () {
	
			var userSettings = [
				{label: "not-modified", components: ["1", "2", "3"]},
				{label: "groups",       components: [["a", "b", "c"], ["d", "e", "f"]], showOn: {scope: 'user'}},
				{label: "one-added",    components: ["4", "5", "6"]}
			];
	
			var defaultSettings = [
				{label: "one-added",    components: ["4", "added", "6", "ignored"], showOn: {scope: 'default'}},
				{label: "groups",       components: [["d", "e", "g"], ["f", "a", "b"], ["h", "i", "j"]], showOn: {scope: 'default'}},
				{label: "one-remains",  components: ["2", "3", "remains"]},
				{label: "empty",        components: ["1", "5"]}
			];
	
			var expected = [
				{label: "not-modified", components: ["1", "2", "3"]},
				{label: "groups",       components: [["a", "b", "c"], ["d", "e", "f"], ["g"], ["h", "i", "j"]], showOn: {scope: 'user'}},
				{label: "one-added",    components: ["4", "5", "6", "added"], showOn: {scope: 'default'}},
				{label: "one-remains",  components: ["remains"]}
			];

			var combined = Settings.combineToolbarSettings(userSettings, defaultSettings, ["ignored"]);
			deepEqual(expected, combined);
		});
	
		test('Aggregate UI Settings', function () {
			// define some configs for plugins
			var formatConfig = {
				toolbar: {
					tabs: [{
						id: 'format',
						components: [['format.bold', 'format.italic', 'format.underline', 'format.strong']]
					}, {
						id: 'insert',
						components: [['format.paragraph', 'format.h1']]
					}]
				}
			};
			var linkConfig = {
				toolbar: {
					tabs: [{
						id: 'format',
						components: [['link.formatlink']]
					}, {
						id: 'insert',
						components: [['link.insertlink']]
					}, {
						id: 'link',
						components: [['link.removelink']]
					}]
				}
			};
	
			// initialize the plugin (default settings)
			UiPlugin.init();
	
			// merge the plugin configs
			Ui.mergeConfig(formatConfig);
			var merged = Ui.mergeConfig(linkConfig);
	
			// check for expected result
			var expected = {
				toolbar: {
					tabs: [{
						id: 'format',
						components: [['format.bold', 'format.italic', 'format.underline', 'format.strong'], ['link.formatlink'], '*']
					}, {
						id: 'insert',
						components: [['format.paragraph', 'format.h1'], ['link.insertlink'], '*']
					}, {
						id: 'link',
						components: [['link.removelink'], '*']
					}, {
						id: '*'
					}]
				}
			};
			deepEqual(merged, expected);
	
			// define some implementation config (force a single component somewhere else)
			UiPlugin.settings.config = {
				toolbar: {
					tabs: [{
						id: 'format',
						components: [['format.underline'], '*']
					}, {
						id: '*'
					}]
				}
			};
			UiPlugin.init();
	
			// merge the plugin configs
			Ui.mergeConfig(formatConfig);
			merged = Ui.mergeConfig(linkConfig);
	
			// check for expected result
			expected = {
				toolbar: {
					tabs: [{
						id: 'format',
						components: [['format.underline'], ['format.bold', 'format.italic', 'format.strong'], ['link.formatlink'], '*']
					}, {
						id: 'insert',
						components: [['format.paragraph', 'format.h1'], ['link.insertlink'], '*']
					}, {
						id: 'link',
						components: [['link.removelink'], '*']
					}, {
						id: '*'
					}]
				}
			};
			deepEqual(merged, expected);
	
			// define some implementation config (don't allow new tabs added, all components in a single tab)
			UiPlugin.settings.config = {
				toolbar: {
					tabs: [{
						id: 'mytab',
						components: ['*']
					}]
				}
			};
			UiPlugin.init();
	
			// merge the plugin configs
			Ui.mergeConfig(formatConfig);
			merged = Ui.mergeConfig(linkConfig);
	
			// check for expected result
			expected = {
				toolbar: {
					tabs: [{
						id: 'mytab',
						components: [['format.bold', 'format.italic', 'format.underline', 'format.strong'], ['format.paragraph', 'format.h1'], ['link.formatlink'], ['link.insertlink'], ['link.removelink'], '*']
					}]
				}
			};
			deepEqual(merged, expected);
	
			// define some implementation config (switch link.* and format.* components)
			UiPlugin.settings.config = {
				toolbar: {
					tabs: [{
						id: 'link',
						components: [['link.*']]
					}, {
						id: 'insert',
						components: [['link.*'], ['format.*'], '*']
					}, {
						id: 'format',
						components: [['link.*'], ['format.*'], '*']
					}]
				}
			};
			UiPlugin.init();
	
			// merge the plugin configs
			Ui.mergeConfig(formatConfig);
			merged = Ui.mergeConfig(linkConfig);
	
			// check for expected result
			expected = {
				toolbar: {
					tabs: [{
						id: 'link',
						components: [['link.removelink', 'link.*']]
					}, {
						id: 'insert',
						components: [['link.insertlink', 'link.*'], ['format.paragraph', 'format.h1', 'format.*'], '*']
					}, {
						id: 'format',
						components: [['link.formatlink', 'link.*'], ['format.bold', 'format.italic', 'format.underline', 'format.strong', 'format.*'], '*']
					}]
				}
			};
			deepEqual(merged, expected);
	
			// define some implementation config (some specific components, general wildcard)
			UiPlugin.settings.config = {
				toolbar: {
					tabs: [{
						id: 'favorite',
						components: [['format.paragraph', 'link.insertlink'], ['format.underline']]
					}, {
						id: 'lostandfound',
						components: ['*']
					}]
				}
			};
			UiPlugin.init();
	
			// merge the plugin configs
			Ui.mergeConfig(formatConfig);
			merged = Ui.mergeConfig(linkConfig);
	
			// check for expected result
			expected = {
				toolbar: {
					tabs: [{
						id: 'favorite',
						components: [['format.paragraph', 'link.insertlink'], ['format.underline']]
					}, {
						id: 'lostandfound',
						components: [['format.bold', 'format.italic', 'format.strong'], ['format.h1'], ['link.formatlink'], ['link.removelink'], '*']
					}]
				}
			};
			deepEqual(merged, expected);
	
			// define some implementation config (some specific components, wildcards)
			UiPlugin.settings.config = {
				toolbar: {
					tabs: [{
						id: 'favorite',
						components: [['link.*'], ['format.paragraph', 'link.insertlink'], ['format.*'], ['format.underline']]
					}, {
						id: 'lostandfound',
						components: ['*']
					}]
				}
			};
			UiPlugin.init();
	
			// merge the plugin configs
			Ui.mergeConfig(formatConfig);
			merged = Ui.mergeConfig(linkConfig);
	
			// check for expected result
			expected = {
				toolbar: {
					tabs: [{
						id: 'favorite',
						components: [['link.formatlink', 'link.removelink', 'link.*'], ['format.paragraph', 'link.insertlink'], ['format.bold', 'format.italic', 'format.strong', 'format.h1', 'format.*'], ['format.underline']]
					}, {
						id: 'lostandfound',
						components: ['*']
					}]
				}
			};
			deepEqual(merged, expected);
		});
	});
});
