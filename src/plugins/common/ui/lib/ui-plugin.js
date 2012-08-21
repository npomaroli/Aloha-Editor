/* ui-plugin.js is part of Aloha Editor project http://aloha-editor.org
 *
 * Aloha Editor is a WYSIWYG HTML5 inline editing library and editor.
 * Copyright (c) 2010-2012 Gentics Software GmbH, Vienna, Austria.
 * Contributors http://aloha-editor.org/contribution.php
 *
 * Aloha Editor is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or any later version.
 *
 * Aloha Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 *
 * As an additional permission to the GNU GPL version 2, you may distribute
 * non-source (e.g., minimized or compacted) forms of the Aloha-Editor
 * source code without the copy of the GNU GPL normally required,
 * provided you include this license notice and a URL through which
 * recipients can access the Corresponding Source.
 */
/*global define:true */
/**
 * The ui/ui-plugin module controls the creation and display of the UI.
 */
define('ui/ui-plugin', [
	'jquery',
	'aloha',
	'aloha/plugin',
	'ui/context',
	'ui/container',
	'ui/surface',
	'ui/toolbar',
	'ui/scopes',
	'ui/settings',
	'PubSub',
	'util/trees',
	// Most modules of the ui plugin depend on jquery-ui, but its easy
	// to forget to add the dependency so we do it here.
	'jqueryui'
], function (
	$,
	Aloha,
	Plugin,
	Context,
	Container,
	Surface,
	Toolbar,
	Scopes,
	Settings,
	PubSub,
	Trees
) {
	'use strict';

	var context = new Context(),
        toolbar = new Toolbar(context, getToolbarSettings()),
	    components = {},
	    mergedConfig = {
			toolbar: {
				tabs: [{
					id: '*'
				}]
			}
		};

	Aloha.bind('aloha-editable-activated', function (event, alohaEvent) {
		Surface.show(context);
		Container.showContainersForContext(context, event);
	});

	Aloha.bind('aloha-editable-deactivated', function (event, alohaEvent) {
		if (!Surface.suppressHide) {
			Surface.hide(context);
		}
	});

	PubSub.sub('aloha.ui.scope.change', function () {
		Container.showContainersForContext(context);
		primaryScopeForegroundTab(Scopes.getPrimaryScope());
	});

	function getToolbarSettings() {
		var userSettings = Aloha.settings.toolbar,
		    defaultSettings = Settings.defaultToolbarSettings;
		if (!userSettings) {
			return defaultSettings.tabs;
		}
		return Settings.combineToolbarSettings(
			userSettings.tabs || [],
			defaultSettings.tabs,
			userSettings.exclude || []
		);
	}

	function primaryScopeForegroundTab() {
		var tabs = toolbar._tabs,
		    primaryScope = Scopes.getPrimaryScope(),
		    settings,
		    i;
		for (i = 0; i < tabs.length; i++) {
			settings = tabs[i].settings;
			if ('object' === $.type(settings.showOn) && settings.showOn.scope === primaryScope) {
				tabs[i].tab.foreground();
				break;
			}
		}
	}

	/**
	 * Adopts a component instance into the UI.
	 *
	 * Usually, the implementation of this method will display the
	 * component, at a position in the UI given by the slot
	 * argument.
	 *
	 * @param slot
	 *        A position argument that is interpreted by the UI however it likes.
	 * @param component
	 *        An instance of a component to adopt into the given slot.
	 * @api
	 */
	function adoptInto(slot, component) {
		components[slot] = component;
		return toolbar.adoptInto(slot, component);
	}

	function getComponentAtSlot(slot) {
		return components[slot] || null;
	}

	/**
	 * Shows the toolbar.
	 *
	 * By default, the toolbar will be hidden when no editable is
	 * activated, and shown when an editable is activated. Calling
	 * this function will show the toolbar regardless of whether an
	 * editable is activated.
	 *
	 * Please note that the toolbar will not remain visible if an
	 * editable is subsequently deactivated.
	 *
	 * @param {?Object} event
	 *        An optional event argument that caused the toolbar to be show.
	 *        Will be passed on to Aloha.settings.toolbar.tabs[i].showOn functions.
	 * @api
	 */
	function showToolbar(event) {
		Surface.show(context);
		Container.showContainersForContext(context, event);
	}

	/**
	 * Determine the match score for the given name and pattern
	 * A negative score means "no match".
	 * If the score is zero or positive, the score equals the number
	 * of matching non-wildcard pattern characters. This means that
	 * the score has the number of characters in the name as upper
	 * limit. Higher score generally means "better match". 
	 * 
	 * Example:
	 * name = 'table.row.addrow' (16 characters)
	 * pattern 'table.row.*' matches with a score of 10
	 * pattern 'table.*' matches with a score of 6
	 * pattern '*' matches with a score of 0
	 * pattern 'format.*' does not match (score -1)
	 *
	 * @param {string} tab
	 *        Name of the tab in which the component is supposed to be
	 * @param {string} name
	 *        Name of the component to be matched against the pattern
	 * @param {string} target
	 *        Name of the target tab
	 * @param {string} pattern
	 *        Pattern to match against
	 */
	function matchScore(tab, name, target, pattern) {
		// TODO precompile the regex'es
		var regExp = new RegExp(pattern.replace(/\./g, '\\.')
			.replace(/(\*?)([^*]+)(\*?)/, '^($1)($2)($3)$')
			.replace(/\*/g, '.*'));
		var match = name.match(regExp), score;
		if (match) {
			if (match.length >= 3) {
				// found matching non-wildcard characters
				score = match[2].length;
			} else {
				// no matching non-wildcard characters,
				// but still a match ('*')
				score = 0;
			}
			// if the tab name matches, we make the score
			// slightly better
			if (tab === target) {
				score += 0.1;
			}
		} else {
			// no match
			score = -1;
		}

		return score;
	}

	/**
	 * Find the best match for the given tab/component.
	 * If a best match was found, insert the component at the position
	 * Return true whether component was inserted, false if not
	 * 
	 * @param {string} tab
	 *        name of the tab
	 * @param {string} component
	 *        name of the component
	 * @param {string} surface
	 *        name of the surface (e.g. 'toolbar')
	 * @param {string} sub
	 *        name of the subsurface (e.g. 'tabs')
	 * 
	 * @return {boolean} true if the component was inserted, false if not
	 */
	function findMatch(tab, component, surface, sub) {
		var i, len = mergedConfig[surface][sub].length;
		var bestScore = -1, bestContainer, bestIndex;
		var container, iCon, lenCon, score;
		var iCon2, lenCon2;

		for (i = 0; i < len; i++) {
			container = mergedConfig[surface][sub][i].components;
			if (container) {
				lenCon = container.length;
				for (iCon = 0; iCon < lenCon; iCon++) {
					if (container[iCon] instanceof Array) {
						lenCon2 = container[iCon].length;
						for (iCon2 = 0; iCon2 < lenCon2; iCon2++) {
							score = matchScore(tab, component, mergedConfig[surface][sub][i].id, container[iCon][iCon2]);
							if (score > bestScore) {
								bestScore = score;
								bestContainer = container[iCon];
								bestIndex = iCon2;
							}
						}
					} else {
						score = matchScore(tab, component, mergedConfig[surface][sub][i].id, container[iCon]);
						if (score > bestScore) {
							bestScore = score;
							bestContainer = container;
							bestIndex = iCon;
						}
					}
				}
			}
		}

		// we ignore matches with the '*' wildcard (score 0) here
		if (bestScore >= 1) {
			// only add the component, if a wildcard match
			if (bestScore < component.length) {
				bestContainer.splice(bestIndex, 0, component);
			}
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Merge the given components array (in the given tab)
	 * into the existing config.
	 * 
	 * @param {string} tab
	 *        name of the tab
	 * @param {array} compArray
	 *        array of components
	 * @param {string} name of the surface (e.g. 'toolbar')
	 * @param {string} name of the subsurface (e.g. 'tabs')
	 */
	function mergeCompArray(tab, compArray, surface, subsurface) {
		var i, length = compArray.length;
		for (i = 0; i < length; i++) {
			if (compArray[i] instanceof Array) {
				// found a group
				mergeCompArray(tab, compArray[i], surface, subsurface);
				if (compArray[i].length === 0) {
					compArray[i] = null;
				}
			} else {
				// found a component
				if (findMatch(tab, compArray[i], surface, subsurface)) {
					// remove the component
					compArray[i] = null;
				}
			}
		}

		// clean the array (remove all null entries)
		for (i = compArray.length - 1; i >= 0; i--) {
			if (compArray[i] === null) {
				compArray.splice(i, 1);
			} else if (compArray[i] instanceof Array) {
				var iA;
				for (iA = compArray[i].length - 1; iA >= 0; iA--) {
					if (compArray[i][iA] === null) {
						compArray[i].splice(iA, 1);
					}
				}
				if (compArray[i].length === 0) {
					compArray.splice(i, 1);
				}
			}
		}
	}

	function mergeTabComps(compArray, into) {
		var i, length = into.length, iC;

		for (i = 0; i < length; i++) {
			if (into[i] === '*') {
				for (iC = compArray.length - 1; iC >= 0; iC--) {
					into.splice(i, 0, compArray[iC]);
				}
				return;
			}
		}
	}

	function mergeTab(tab, compArray, surface, subsurface) {
		var i, length = mergedConfig[surface][subsurface].length,
			tabWildCardIndex = -1, compWildCardIndex = -1, mergedTab,
			iTab, lenTab;

		for (i = 0; i < length; i++) {
			mergedTab = mergedConfig[surface][subsurface][i];
			if (mergedTab.id === tab) {
				mergeTabComps(compArray, mergedTab.components);
				return;
			} else if (compWildCardIndex < 0 && mergedTab.components) {
				lenTab = mergedTab.components.length;
				for (iTab = 0; iTab < lenTab; iTab++) {
					if (mergedTab.components[iTab] === '*') {
						compWildCardIndex = i;
						break;
					}
				}
			} else if (tabWildCardIndex < 0 && mergedTab.id === '*') {
				tabWildCardIndex = i;
			}
		}

		if (tabWildCardIndex >= 0) {
			var newTab = {
				id: tab,
				components: compArray
			};
			newTab.components.push('*');
			mergedConfig[surface][subsurface].splice(tabWildCardIndex, 0, newTab);
		} else if (compWildCardIndex >= 0) {
			mergeTabComps(compArray, mergedConfig[surface][subsurface][compWildCardIndex].components);
		}
	}

	/**
	 * Merge the given config into the already existing configuration
	 * 
	 * @param {Object} config
	 *        Configuration of components
	 * @return undefined
	 * @api
	 */
	function mergeConfig(config) {
		var tabIndex, tabsLength, tab, compLength, compIndex;
		config = Trees.clone(config);
		if (config.toolbar instanceof Object) {
			tabsLength = config.toolbar.tabs.length;
			for (tabIndex = 0; tabIndex < tabsLength; tabIndex++) {
				tab = config.toolbar.tabs[tabIndex];
				if (tab.components) {
					mergeCompArray(tab.id, tab.components, 'toolbar', 'tabs');
				}
			}
			// now merge the remaining tabs
			tabsLength = config.toolbar.tabs.length;
			for (tabIndex = 0; tabIndex < tabsLength; tabIndex++) {
				tab = config.toolbar.tabs[tabIndex];
				if (tab.components) {
					mergeTab(tab.id, tab.components, 'toolbar', 'tabs');
				}
			}
		}


		return mergedConfig;
	}

	/**
	 * This module is part of the Aloha API.
	 * It is valid to override this module via requirejs to provide a
	 * custom behaviour. An overriding module must implement all API
	 * methods. Every member must have an api annotation. No non-api
	 * members are allowed.
	 * @api
	 */
	return Plugin.create('ui', {
		/**
		 * Initialize the plugin
		 */
		init: function () {
			if (this.settings && this.settings.config) {
				mergedConfig = this.settings.config;
			}
		},

		/**
		 * Adopts a component instance into the UI.
		 *
		 * Usually, the implementation of this method will display the
		 * component, at a position in the UI given by the slot
		 * argument.
		 *
		 * @param slot
		 *        A position argument that is interpreted by the UI however it likes.
		 * @param component
		 *        An instance of a component to adopt into the given slot.
		 * @api
		 */
		adoptInto: adoptInto,

		mergeConfig: mergeConfig,

		/**
		 * Retrieves the component that was adopted at the given UI slot.
		 *
		 * @param {string} slot The name of the slot.
		 * @return {Component?} A component, or null if no slot was adopted
		 *                      into the slot.
		 */
		getAdoptedComponent: getComponentAtSlot,
		showToolbar: showToolbar,
		components: components
	});
});
