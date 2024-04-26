var SvelteFormer = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}
	/**
	 * List of attributes that should always be set through the attr method,
	 * because updating them through the property setter doesn't work reliably.
	 * In the example of `width`/`height`, the problem is that the setter only
	 * accepts numeric values, but the attribute can also be set to a string like `50%`.
	 * If this list becomes too big, rethink this approach.
	 */
	const always_set_through_set_attribute = ['width', 'height'];

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {{ [x: string]: string }} attributes
	 * @returns {void}
	 */
	function set_attributes(node, attributes) {
		// @ts-ignore
		const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
		for (const key in attributes) {
			if (attributes[key] == null) {
				node.removeAttribute(key);
			} else if (key === 'style') {
				node.style.cssText = attributes[key];
			} else if (key === '__value') {
				/** @type {any} */ (node).value = node[key] = attributes[key];
			} else if (
				descriptors[key] &&
				descriptors[key].set &&
				always_set_through_set_attribute.indexOf(key) === -1
			) {
				node[key] = attributes[key];
			} else {
				attr(node, key, attributes[key]);
			}
		}
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function select_option(select, value, mounting) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];
			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
		if (!mounting || value !== undefined) {
			select.selectedIndex = -1; // no option should be selected
		}
	}

	/**
	 * @returns {void} */
	function select_options(select, value) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];
			option.selected = ~value.indexOf(option.__value);
		}
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	/** @returns {void} */
	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {{}} */
	function get_spread_update(levels, updates) {
		const update = {};
		const to_null_out = {};
		const accounted_for = { $$scope: 1 };
		let i = levels.length;
		while (i--) {
			const o = levels[i];
			const n = updates[i];
			if (n) {
				for (const key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}
				for (const key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}
				levels[i] = n;
			} else {
				for (const key in o) {
					accounted_for[key] = 1;
				}
			}
		}
		for (const key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}
		return update;
	}

	/** @returns {void} */
	function bind(component, name, callback) {
		const index = component.$$.props[name];
		if (index !== undefined) {
			component.$$.bound[index] = callback;
			callback(component.$$.ctx[index]);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	var e=[],t=[];function n(n,r){if(n&&"undefined"!=typeof document){var a,s=!0===r.prepend?"prepend":"append",d=!0===r.singleTag,i="string"==typeof r.container?document.querySelector(r.container):document.getElementsByTagName("head")[0];if(d){var u=e.indexOf(i);-1===u&&(u=e.push(i)-1,t[u]={}),a=t[u]&&t[u][s]?t[u][s]:t[u][s]=c();}else a=c();65279===n.charCodeAt(0)&&(n=n.substring(1)),a.styleSheet?a.styleSheet.cssText+=n:a.appendChild(document.createTextNode(n));}function c(){var e=document.createElement("style");if(e.setAttribute("type","text/css"),r.attributes)for(var t=Object.keys(r.attributes),n=0;n<t.length;n++)e.setAttribute(t[n],r.attributes[t[n]]);var a="prepend"===s?"afterbegin":"beforeend";return i.insertAdjacentElement(a,e),e}}

	var css$1 = "/**\n * Copyright (c) 2024 Anthony Mugendi\n * \n * This software is released under the MIT License.\n * https://opensource.org/licenses/MIT\n */\n@-ms-viewport {\n  width: device-width;\n}\nhtml {\n  -webkit-box-sizing: border-box;\n  box-sizing: border-box;\n  -ms-overflow-style: scrollbar;\n}\n\n*,\n::after,\n::before {\n  -webkit-box-sizing: inherit;\n  box-sizing: inherit;\n}\n\n.container {\n  margin-right: auto;\n  margin-left: auto;\n}\n\n@media (min-width: 576px) {\n  .container {\n    width: 540px;\n    max-width: 100%;\n  }\n}\n@media (min-width: 768px) {\n  .container {\n    width: 720px;\n    max-width: 100%;\n  }\n}\n@media (min-width: 992px) {\n  .container {\n    width: 960px;\n    max-width: 100%;\n  }\n}\n@media (min-width: 1200px) {\n  .container {\n    width: 1140px;\n    max-width: 100%;\n  }\n}\n.container-fluid {\n  width: 100%;\n  margin-right: auto;\n  margin-left: auto;\n  padding-right: 15px;\n  padding-left: 15px;\n}\n\n@media (min-width: 576px) {\n  .container-fluid {\n    padding-right: 15px;\n    padding-left: 15px;\n  }\n}\n@media (min-width: 768px) {\n  .container-fluid {\n    padding-right: 15px;\n    padding-left: 15px;\n  }\n}\n@media (min-width: 992px) {\n  .container-fluid {\n    padding-right: 15px;\n    padding-left: 15px;\n  }\n}\n@media (min-width: 1200px) {\n  .container-fluid {\n    padding-right: 15px;\n    padding-left: 15px;\n  }\n}\n.row {\n  display: -webkit-box;\n  display: -webkit-flex;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-flex-wrap: wrap;\n  -ms-flex-wrap: wrap;\n  flex-wrap: wrap;\n  margin-right: -15px;\n  margin-left: -15px;\n}\n\n.no-gutters {\n  margin-right: 0;\n  margin-left: 0;\n}\n\n.no-gutters > .col,\n.no-gutters > [class*=col-] {\n  padding-right: 0;\n  padding-left: 0;\n}\n\n.col,\n.col-1,\n.col-10,\n.col-11,\n.col-12,\n.col-2,\n.col-3,\n.col-4,\n.col-5,\n.col-6,\n.col-7,\n.col-8,\n.col-9,\n.col-auto,\n.col-lg,\n.col-lg-1,\n.col-lg-10,\n.col-lg-11,\n.col-lg-12,\n.col-lg-2,\n.col-lg-3,\n.col-lg-4,\n.col-lg-5,\n.col-lg-6,\n.col-lg-7,\n.col-lg-8,\n.col-lg-9,\n.col-lg-auto,\n.col-md,\n.col-md-1,\n.col-md-10,\n.col-md-11,\n.col-md-12,\n.col-md-2,\n.col-md-3,\n.col-md-4,\n.col-md-5,\n.col-md-6,\n.col-md-7,\n.col-md-8,\n.col-md-9,\n.col-md-auto,\n.col-sm,\n.col-sm-1,\n.col-sm-10,\n.col-sm-11,\n.col-sm-12,\n.col-sm-2,\n.col-sm-3,\n.col-sm-4,\n.col-sm-5,\n.col-sm-6,\n.col-sm-7,\n.col-sm-8,\n.col-sm-9,\n.col-sm-auto,\n.col-xl,\n.col-xl-1,\n.col-xl-10,\n.col-xl-11,\n.col-xl-12,\n.col-xl-2,\n.col-xl-3,\n.col-xl-4,\n.col-xl-5,\n.col-xl-6,\n.col-xl-7,\n.col-xl-8,\n.col-xl-9,\n.col-xl-auto {\n  position: relative;\n  width: 100%;\n  min-height: 1px;\n  padding-right: 5px;\n  padding-left: 5px;\n}\n\n.col {\n  -webkit-flex-basis: 0;\n  -ms-flex-preferred-size: 0;\n  flex-basis: 0;\n  -webkit-box-flex: 1;\n  -webkit-flex-grow: 1;\n  -ms-flex-positive: 1;\n  flex-grow: 1;\n  max-width: 100%;\n}\n\n.col-auto {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 auto;\n  -ms-flex: 0 0 auto;\n  flex: 0 0 auto;\n  width: auto;\n  max-width: none;\n}\n\n.col-1 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 8.333333%;\n  -ms-flex: 0 0 8.333333%;\n  flex: 0 0 8.333333%;\n  max-width: 8.333333%;\n}\n\n.col-2 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 16.666667%;\n  -ms-flex: 0 0 16.666667%;\n  flex: 0 0 16.666667%;\n  max-width: 16.666667%;\n}\n\n.col-3 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 25%;\n  -ms-flex: 0 0 25%;\n  flex: 0 0 25%;\n  max-width: 25%;\n}\n\n.col-4 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 33.333333%;\n  -ms-flex: 0 0 33.333333%;\n  flex: 0 0 33.333333%;\n  max-width: 33.333333%;\n}\n\n.col-5 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 41.666667%;\n  -ms-flex: 0 0 41.666667%;\n  flex: 0 0 41.666667%;\n  max-width: 41.666667%;\n}\n\n.col-6 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 50%;\n  -ms-flex: 0 0 50%;\n  flex: 0 0 50%;\n  max-width: 50%;\n}\n\n.col-7 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 58.333333%;\n  -ms-flex: 0 0 58.333333%;\n  flex: 0 0 58.333333%;\n  max-width: 58.333333%;\n}\n\n.col-8 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 66.666667%;\n  -ms-flex: 0 0 66.666667%;\n  flex: 0 0 66.666667%;\n  max-width: 66.666667%;\n}\n\n.col-9 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 75%;\n  -ms-flex: 0 0 75%;\n  flex: 0 0 75%;\n  max-width: 75%;\n}\n\n.col-10 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 83.333333%;\n  -ms-flex: 0 0 83.333333%;\n  flex: 0 0 83.333333%;\n  max-width: 83.333333%;\n}\n\n.col-11 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 91.666667%;\n  -ms-flex: 0 0 91.666667%;\n  flex: 0 0 91.666667%;\n  max-width: 91.666667%;\n}\n\n.col-12 {\n  -webkit-box-flex: 0;\n  -webkit-flex: 0 0 100%;\n  -ms-flex: 0 0 100%;\n  flex: 0 0 100%;\n  max-width: 100%;\n}\n\n@media (min-width: 576px) {\n  .col-sm {\n    -webkit-flex-basis: 0;\n    -ms-flex-preferred-size: 0;\n    flex-basis: 0;\n    -webkit-box-flex: 1;\n    -webkit-flex-grow: 1;\n    -ms-flex-positive: 1;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .col-sm-auto {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 auto;\n    -ms-flex: 0 0 auto;\n    flex: 0 0 auto;\n    width: auto;\n    max-width: none;\n  }\n  .col-sm-1 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 8.333333%;\n    -ms-flex: 0 0 8.333333%;\n    flex: 0 0 8.333333%;\n    max-width: 8.333333%;\n  }\n  .col-sm-2 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 16.666667%;\n    -ms-flex: 0 0 16.666667%;\n    flex: 0 0 16.666667%;\n    max-width: 16.666667%;\n  }\n  .col-sm-3 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 25%;\n    -ms-flex: 0 0 25%;\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .col-sm-4 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 33.333333%;\n    -ms-flex: 0 0 33.333333%;\n    flex: 0 0 33.333333%;\n    max-width: 33.333333%;\n  }\n  .col-sm-5 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 41.666667%;\n    -ms-flex: 0 0 41.666667%;\n    flex: 0 0 41.666667%;\n    max-width: 41.666667%;\n  }\n  .col-sm-6 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 50%;\n    -ms-flex: 0 0 50%;\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .col-sm-7 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 58.333333%;\n    -ms-flex: 0 0 58.333333%;\n    flex: 0 0 58.333333%;\n    max-width: 58.333333%;\n  }\n  .col-sm-8 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 66.666667%;\n    -ms-flex: 0 0 66.666667%;\n    flex: 0 0 66.666667%;\n    max-width: 66.666667%;\n  }\n  .col-sm-9 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 75%;\n    -ms-flex: 0 0 75%;\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .col-sm-10 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 83.333333%;\n    -ms-flex: 0 0 83.333333%;\n    flex: 0 0 83.333333%;\n    max-width: 83.333333%;\n  }\n  .col-sm-11 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 91.666667%;\n    -ms-flex: 0 0 91.666667%;\n    flex: 0 0 91.666667%;\n    max-width: 91.666667%;\n  }\n  .col-sm-12 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 100%;\n    -ms-flex: 0 0 100%;\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n}\n@media (min-width: 768px) {\n  .col-md {\n    -webkit-flex-basis: 0;\n    -ms-flex-preferred-size: 0;\n    flex-basis: 0;\n    -webkit-box-flex: 1;\n    -webkit-flex-grow: 1;\n    -ms-flex-positive: 1;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .col-md-auto {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 auto;\n    -ms-flex: 0 0 auto;\n    flex: 0 0 auto;\n    width: auto;\n    max-width: none;\n  }\n  .col-md-1 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 8.333333%;\n    -ms-flex: 0 0 8.333333%;\n    flex: 0 0 8.333333%;\n    max-width: 8.333333%;\n  }\n  .col-md-2 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 16.666667%;\n    -ms-flex: 0 0 16.666667%;\n    flex: 0 0 16.666667%;\n    max-width: 16.666667%;\n  }\n  .col-md-3 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 25%;\n    -ms-flex: 0 0 25%;\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .col-md-4 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 33.333333%;\n    -ms-flex: 0 0 33.333333%;\n    flex: 0 0 33.333333%;\n    max-width: 33.333333%;\n  }\n  .col-md-5 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 41.666667%;\n    -ms-flex: 0 0 41.666667%;\n    flex: 0 0 41.666667%;\n    max-width: 41.666667%;\n  }\n  .col-md-6 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 50%;\n    -ms-flex: 0 0 50%;\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .col-md-7 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 58.333333%;\n    -ms-flex: 0 0 58.333333%;\n    flex: 0 0 58.333333%;\n    max-width: 58.333333%;\n  }\n  .col-md-8 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 66.666667%;\n    -ms-flex: 0 0 66.666667%;\n    flex: 0 0 66.666667%;\n    max-width: 66.666667%;\n  }\n  .col-md-9 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 75%;\n    -ms-flex: 0 0 75%;\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .col-md-10 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 83.333333%;\n    -ms-flex: 0 0 83.333333%;\n    flex: 0 0 83.333333%;\n    max-width: 83.333333%;\n  }\n  .col-md-11 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 91.666667%;\n    -ms-flex: 0 0 91.666667%;\n    flex: 0 0 91.666667%;\n    max-width: 91.666667%;\n  }\n  .col-md-12 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 100%;\n    -ms-flex: 0 0 100%;\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n}\n@media (min-width: 992px) {\n  .col-lg {\n    -webkit-flex-basis: 0;\n    -ms-flex-preferred-size: 0;\n    flex-basis: 0;\n    -webkit-box-flex: 1;\n    -webkit-flex-grow: 1;\n    -ms-flex-positive: 1;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .col-lg-auto {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 auto;\n    -ms-flex: 0 0 auto;\n    flex: 0 0 auto;\n    width: auto;\n    max-width: none;\n  }\n  .col-lg-1 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 8.333333%;\n    -ms-flex: 0 0 8.333333%;\n    flex: 0 0 8.333333%;\n    max-width: 8.333333%;\n  }\n  .col-lg-2 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 16.666667%;\n    -ms-flex: 0 0 16.666667%;\n    flex: 0 0 16.666667%;\n    max-width: 16.666667%;\n  }\n  .col-lg-3 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 25%;\n    -ms-flex: 0 0 25%;\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .col-lg-4 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 33.333333%;\n    -ms-flex: 0 0 33.333333%;\n    flex: 0 0 33.333333%;\n    max-width: 33.333333%;\n  }\n  .col-lg-5 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 41.666667%;\n    -ms-flex: 0 0 41.666667%;\n    flex: 0 0 41.666667%;\n    max-width: 41.666667%;\n  }\n  .col-lg-6 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 50%;\n    -ms-flex: 0 0 50%;\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .col-lg-7 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 58.333333%;\n    -ms-flex: 0 0 58.333333%;\n    flex: 0 0 58.333333%;\n    max-width: 58.333333%;\n  }\n  .col-lg-8 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 66.666667%;\n    -ms-flex: 0 0 66.666667%;\n    flex: 0 0 66.666667%;\n    max-width: 66.666667%;\n  }\n  .col-lg-9 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 75%;\n    -ms-flex: 0 0 75%;\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .col-lg-10 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 83.333333%;\n    -ms-flex: 0 0 83.333333%;\n    flex: 0 0 83.333333%;\n    max-width: 83.333333%;\n  }\n  .col-lg-11 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 91.666667%;\n    -ms-flex: 0 0 91.666667%;\n    flex: 0 0 91.666667%;\n    max-width: 91.666667%;\n  }\n  .col-lg-12 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 100%;\n    -ms-flex: 0 0 100%;\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n}\n@media (min-width: 1200px) {\n  .col-xl {\n    -webkit-flex-basis: 0;\n    -ms-flex-preferred-size: 0;\n    flex-basis: 0;\n    -webkit-box-flex: 1;\n    -webkit-flex-grow: 1;\n    -ms-flex-positive: 1;\n    flex-grow: 1;\n    max-width: 100%;\n  }\n  .col-xl-auto {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 auto;\n    -ms-flex: 0 0 auto;\n    flex: 0 0 auto;\n    width: auto;\n    max-width: none;\n  }\n  .col-xl-1 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 8.333333%;\n    -ms-flex: 0 0 8.333333%;\n    flex: 0 0 8.333333%;\n    max-width: 8.333333%;\n  }\n  .col-xl-2 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 16.666667%;\n    -ms-flex: 0 0 16.666667%;\n    flex: 0 0 16.666667%;\n    max-width: 16.666667%;\n  }\n  .col-xl-3 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 25%;\n    -ms-flex: 0 0 25%;\n    flex: 0 0 25%;\n    max-width: 25%;\n  }\n  .col-xl-4 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 33.333333%;\n    -ms-flex: 0 0 33.333333%;\n    flex: 0 0 33.333333%;\n    max-width: 33.333333%;\n  }\n  .col-xl-5 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 41.666667%;\n    -ms-flex: 0 0 41.666667%;\n    flex: 0 0 41.666667%;\n    max-width: 41.666667%;\n  }\n  .col-xl-6 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 50%;\n    -ms-flex: 0 0 50%;\n    flex: 0 0 50%;\n    max-width: 50%;\n  }\n  .col-xl-7 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 58.333333%;\n    -ms-flex: 0 0 58.333333%;\n    flex: 0 0 58.333333%;\n    max-width: 58.333333%;\n  }\n  .col-xl-8 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 66.666667%;\n    -ms-flex: 0 0 66.666667%;\n    flex: 0 0 66.666667%;\n    max-width: 66.666667%;\n  }\n  .col-xl-9 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 75%;\n    -ms-flex: 0 0 75%;\n    flex: 0 0 75%;\n    max-width: 75%;\n  }\n  .col-xl-10 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 83.333333%;\n    -ms-flex: 0 0 83.333333%;\n    flex: 0 0 83.333333%;\n    max-width: 83.333333%;\n  }\n  .col-xl-11 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 91.666667%;\n    -ms-flex: 0 0 91.666667%;\n    flex: 0 0 91.666667%;\n    max-width: 91.666667%;\n  }\n  .col-xl-12 {\n    -webkit-box-flex: 0;\n    -webkit-flex: 0 0 100%;\n    -ms-flex: 0 0 100%;\n    flex: 0 0 100%;\n    max-width: 100%;\n  }\n}\n.order-first {\n  -webkit-box-ordinal-group: 0;\n  -webkit-order: -1;\n  -ms-flex-order: -1;\n  order: -1;\n}\n\n.order-last {\n  -webkit-box-ordinal-group: 2;\n  -webkit-order: 1;\n  -ms-flex-order: 1;\n  order: 1;\n}\n\n.order-0 {\n  -webkit-box-ordinal-group: 1;\n  -webkit-order: 0;\n  -ms-flex-order: 0;\n  order: 0;\n}\n\n.flex-row {\n  -webkit-box-orient: horizontal !important;\n  -webkit-box-direction: normal !important;\n  -webkit-flex-direction: row !important;\n  -ms-flex-direction: row !important;\n  flex-direction: row !important;\n}\n\n.flex-column {\n  -webkit-box-orient: vertical !important;\n  -webkit-box-direction: normal !important;\n  -webkit-flex-direction: column !important;\n  -ms-flex-direction: column !important;\n  flex-direction: column !important;\n}\n\n.flex-row-reverse {\n  -webkit-box-orient: horizontal !important;\n  -webkit-box-direction: reverse !important;\n  -webkit-flex-direction: row-reverse !important;\n  -ms-flex-direction: row-reverse !important;\n  flex-direction: row-reverse !important;\n}\n\n.flex-column-reverse {\n  -webkit-box-orient: vertical !important;\n  -webkit-box-direction: reverse !important;\n  -webkit-flex-direction: column-reverse !important;\n  -ms-flex-direction: column-reverse !important;\n  flex-direction: column-reverse !important;\n}\n\n.flex-wrap {\n  -webkit-flex-wrap: wrap !important;\n  -ms-flex-wrap: wrap !important;\n  flex-wrap: wrap !important;\n}\n\n.flex-nowrap {\n  -webkit-flex-wrap: nowrap !important;\n  -ms-flex-wrap: nowrap !important;\n  flex-wrap: nowrap !important;\n}\n\n.flex-wrap-reverse {\n  -webkit-flex-wrap: wrap-reverse !important;\n  -ms-flex-wrap: wrap-reverse !important;\n  flex-wrap: wrap-reverse !important;\n}\n\n.justify-content-start {\n  -webkit-box-pack: start !important;\n  -webkit-justify-content: flex-start !important;\n  -ms-flex-pack: start !important;\n  justify-content: flex-start !important;\n}\n\n.justify-content-end {\n  -webkit-box-pack: end !important;\n  -webkit-justify-content: flex-end !important;\n  -ms-flex-pack: end !important;\n  justify-content: flex-end !important;\n}\n\n.justify-content-center {\n  -webkit-box-pack: center !important;\n  -webkit-justify-content: center !important;\n  -ms-flex-pack: center !important;\n  justify-content: center !important;\n}\n\n.justify-content-between {\n  -webkit-box-pack: justify !important;\n  -webkit-justify-content: space-between !important;\n  -ms-flex-pack: justify !important;\n  justify-content: space-between !important;\n}\n\n.justify-content-around {\n  -webkit-justify-content: space-around !important;\n  -ms-flex-pack: distribute !important;\n  justify-content: space-around !important;\n}\n\n.align-items-start {\n  -webkit-box-align: start !important;\n  -webkit-align-items: flex-start !important;\n  -ms-flex-align: start !important;\n  align-items: flex-start !important;\n}\n\n.align-items-end {\n  -webkit-box-align: end !important;\n  -webkit-align-items: flex-end !important;\n  -ms-flex-align: end !important;\n  align-items: flex-end !important;\n}\n\n.align-items-center {\n  -webkit-box-align: center !important;\n  -webkit-align-items: center !important;\n  -ms-flex-align: center !important;\n  align-items: center !important;\n}\n\n.align-items-baseline {\n  -webkit-box-align: baseline !important;\n  -webkit-align-items: baseline !important;\n  -ms-flex-align: baseline !important;\n  align-items: baseline !important;\n}\n\n.align-items-stretch {\n  -webkit-box-align: stretch !important;\n  -webkit-align-items: stretch !important;\n  -ms-flex-align: stretch !important;\n  align-items: stretch !important;\n}\n\n.align-content-start {\n  -webkit-align-content: flex-start !important;\n  -ms-flex-line-pack: start !important;\n  align-content: flex-start !important;\n}\n\n.align-content-end {\n  -webkit-align-content: flex-end !important;\n  -ms-flex-line-pack: end !important;\n  align-content: flex-end !important;\n}\n\n.align-content-center {\n  -webkit-align-content: center !important;\n  -ms-flex-line-pack: center !important;\n  align-content: center !important;\n}\n\n.align-content-between {\n  -webkit-align-content: space-between !important;\n  -ms-flex-line-pack: justify !important;\n  align-content: space-between !important;\n}\n\n.align-content-around {\n  -webkit-align-content: space-around !important;\n  -ms-flex-line-pack: distribute !important;\n  align-content: space-around !important;\n}\n\n.align-content-stretch {\n  -webkit-align-content: stretch !important;\n  -ms-flex-line-pack: stretch !important;\n  align-content: stretch !important;\n}\n\n.align-self-auto {\n  -webkit-align-self: auto !important;\n  -ms-flex-item-align: auto !important;\n  align-self: auto !important;\n}\n\n.align-self-start {\n  -webkit-align-self: flex-start !important;\n  -ms-flex-item-align: start !important;\n  align-self: flex-start !important;\n}\n\n.align-self-end {\n  -webkit-align-self: flex-end !important;\n  -ms-flex-item-align: end !important;\n  align-self: flex-end !important;\n}\n\n.align-self-center {\n  -webkit-align-self: center !important;\n  -ms-flex-item-align: center !important;\n  align-self: center !important;\n}\n\n.align-self-baseline {\n  -webkit-align-self: baseline !important;\n  -ms-flex-item-align: baseline !important;\n  align-self: baseline !important;\n}\n\n.align-self-stretch {\n  -webkit-align-self: stretch !important;\n  -ms-flex-item-align: stretch !important;\n  align-self: stretch !important;\n}\n\n@media (min-width: 576px) {\n  .order-sm-first {\n    -webkit-box-ordinal-group: 0;\n    -webkit-order: -1;\n    -ms-flex-order: -1;\n    order: -1;\n  }\n  .order-sm-last {\n    -webkit-box-ordinal-group: 2;\n    -webkit-order: 1;\n    -ms-flex-order: 1;\n    order: 1;\n  }\n  .order-sm-0 {\n    -webkit-box-ordinal-group: 1;\n    -webkit-order: 0;\n    -ms-flex-order: 0;\n    order: 0;\n  }\n  .flex-sm-row {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: row !important;\n    -ms-flex-direction: row !important;\n    flex-direction: row !important;\n  }\n  .flex-sm-column {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: column !important;\n    -ms-flex-direction: column !important;\n    flex-direction: column !important;\n  }\n  .flex-sm-row-reverse {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: row-reverse !important;\n    -ms-flex-direction: row-reverse !important;\n    flex-direction: row-reverse !important;\n  }\n  .flex-sm-column-reverse {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: column-reverse !important;\n    -ms-flex-direction: column-reverse !important;\n    flex-direction: column-reverse !important;\n  }\n  .flex-sm-wrap {\n    -webkit-flex-wrap: wrap !important;\n    -ms-flex-wrap: wrap !important;\n    flex-wrap: wrap !important;\n  }\n  .flex-sm-nowrap {\n    -webkit-flex-wrap: nowrap !important;\n    -ms-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n  }\n  .flex-sm-wrap-reverse {\n    -webkit-flex-wrap: wrap-reverse !important;\n    -ms-flex-wrap: wrap-reverse !important;\n    flex-wrap: wrap-reverse !important;\n  }\n  .justify-content-sm-start {\n    -webkit-box-pack: start !important;\n    -webkit-justify-content: flex-start !important;\n    -ms-flex-pack: start !important;\n    justify-content: flex-start !important;\n  }\n  .justify-content-sm-end {\n    -webkit-box-pack: end !important;\n    -webkit-justify-content: flex-end !important;\n    -ms-flex-pack: end !important;\n    justify-content: flex-end !important;\n  }\n  .justify-content-sm-center {\n    -webkit-box-pack: center !important;\n    -webkit-justify-content: center !important;\n    -ms-flex-pack: center !important;\n    justify-content: center !important;\n  }\n  .justify-content-sm-between {\n    -webkit-box-pack: justify !important;\n    -webkit-justify-content: space-between !important;\n    -ms-flex-pack: justify !important;\n    justify-content: space-between !important;\n  }\n  .justify-content-sm-around {\n    -webkit-justify-content: space-around !important;\n    -ms-flex-pack: distribute !important;\n    justify-content: space-around !important;\n  }\n  .align-items-sm-start {\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    -ms-flex-align: start !important;\n    align-items: flex-start !important;\n  }\n  .align-items-sm-end {\n    -webkit-box-align: end !important;\n    -webkit-align-items: flex-end !important;\n    -ms-flex-align: end !important;\n    align-items: flex-end !important;\n  }\n  .align-items-sm-center {\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    -ms-flex-align: center !important;\n    align-items: center !important;\n  }\n  .align-items-sm-baseline {\n    -webkit-box-align: baseline !important;\n    -webkit-align-items: baseline !important;\n    -ms-flex-align: baseline !important;\n    align-items: baseline !important;\n  }\n  .align-items-sm-stretch {\n    -webkit-box-align: stretch !important;\n    -webkit-align-items: stretch !important;\n    -ms-flex-align: stretch !important;\n    align-items: stretch !important;\n  }\n  .align-content-sm-start {\n    -webkit-align-content: flex-start !important;\n    -ms-flex-line-pack: start !important;\n    align-content: flex-start !important;\n  }\n  .align-content-sm-end {\n    -webkit-align-content: flex-end !important;\n    -ms-flex-line-pack: end !important;\n    align-content: flex-end !important;\n  }\n  .align-content-sm-center {\n    -webkit-align-content: center !important;\n    -ms-flex-line-pack: center !important;\n    align-content: center !important;\n  }\n  .align-content-sm-between {\n    -webkit-align-content: space-between !important;\n    -ms-flex-line-pack: justify !important;\n    align-content: space-between !important;\n  }\n  .align-content-sm-around {\n    -webkit-align-content: space-around !important;\n    -ms-flex-line-pack: distribute !important;\n    align-content: space-around !important;\n  }\n  .align-content-sm-stretch {\n    -webkit-align-content: stretch !important;\n    -ms-flex-line-pack: stretch !important;\n    align-content: stretch !important;\n  }\n  .align-self-sm-auto {\n    -webkit-align-self: auto !important;\n    -ms-flex-item-align: auto !important;\n    align-self: auto !important;\n  }\n  .align-self-sm-start {\n    -webkit-align-self: flex-start !important;\n    -ms-flex-item-align: start !important;\n    align-self: flex-start !important;\n  }\n  .align-self-sm-end {\n    -webkit-align-self: flex-end !important;\n    -ms-flex-item-align: end !important;\n    align-self: flex-end !important;\n  }\n  .align-self-sm-center {\n    -webkit-align-self: center !important;\n    -ms-flex-item-align: center !important;\n    align-self: center !important;\n  }\n  .align-self-sm-baseline {\n    -webkit-align-self: baseline !important;\n    -ms-flex-item-align: baseline !important;\n    align-self: baseline !important;\n  }\n  .align-self-sm-stretch {\n    -webkit-align-self: stretch !important;\n    -ms-flex-item-align: stretch !important;\n    align-self: stretch !important;\n  }\n}\n@media (min-width: 768px) {\n  .order-md-first {\n    -webkit-box-ordinal-group: 0;\n    -webkit-order: -1;\n    -ms-flex-order: -1;\n    order: -1;\n  }\n  .order-md-last {\n    -webkit-box-ordinal-group: 2;\n    -webkit-order: 1;\n    -ms-flex-order: 1;\n    order: 1;\n  }\n  .order-md-0 {\n    -webkit-box-ordinal-group: 1;\n    -webkit-order: 0;\n    -ms-flex-order: 0;\n    order: 0;\n  }\n  .flex-md-row {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: row !important;\n    -ms-flex-direction: row !important;\n    flex-direction: row !important;\n  }\n  .flex-md-column {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: column !important;\n    -ms-flex-direction: column !important;\n    flex-direction: column !important;\n  }\n  .flex-md-row-reverse {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: row-reverse !important;\n    -ms-flex-direction: row-reverse !important;\n    flex-direction: row-reverse !important;\n  }\n  .flex-md-column-reverse {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: column-reverse !important;\n    -ms-flex-direction: column-reverse !important;\n    flex-direction: column-reverse !important;\n  }\n  .flex-md-wrap {\n    -webkit-flex-wrap: wrap !important;\n    -ms-flex-wrap: wrap !important;\n    flex-wrap: wrap !important;\n  }\n  .flex-md-nowrap {\n    -webkit-flex-wrap: nowrap !important;\n    -ms-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n  }\n  .flex-md-wrap-reverse {\n    -webkit-flex-wrap: wrap-reverse !important;\n    -ms-flex-wrap: wrap-reverse !important;\n    flex-wrap: wrap-reverse !important;\n  }\n  .justify-content-md-start {\n    -webkit-box-pack: start !important;\n    -webkit-justify-content: flex-start !important;\n    -ms-flex-pack: start !important;\n    justify-content: flex-start !important;\n  }\n  .justify-content-md-end {\n    -webkit-box-pack: end !important;\n    -webkit-justify-content: flex-end !important;\n    -ms-flex-pack: end !important;\n    justify-content: flex-end !important;\n  }\n  .justify-content-md-center {\n    -webkit-box-pack: center !important;\n    -webkit-justify-content: center !important;\n    -ms-flex-pack: center !important;\n    justify-content: center !important;\n  }\n  .justify-content-md-between {\n    -webkit-box-pack: justify !important;\n    -webkit-justify-content: space-between !important;\n    -ms-flex-pack: justify !important;\n    justify-content: space-between !important;\n  }\n  .justify-content-md-around {\n    -webkit-justify-content: space-around !important;\n    -ms-flex-pack: distribute !important;\n    justify-content: space-around !important;\n  }\n  .align-items-md-start {\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    -ms-flex-align: start !important;\n    align-items: flex-start !important;\n  }\n  .align-items-md-end {\n    -webkit-box-align: end !important;\n    -webkit-align-items: flex-end !important;\n    -ms-flex-align: end !important;\n    align-items: flex-end !important;\n  }\n  .align-items-md-center {\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    -ms-flex-align: center !important;\n    align-items: center !important;\n  }\n  .align-items-md-baseline {\n    -webkit-box-align: baseline !important;\n    -webkit-align-items: baseline !important;\n    -ms-flex-align: baseline !important;\n    align-items: baseline !important;\n  }\n  .align-items-md-stretch {\n    -webkit-box-align: stretch !important;\n    -webkit-align-items: stretch !important;\n    -ms-flex-align: stretch !important;\n    align-items: stretch !important;\n  }\n  .align-content-md-start {\n    -webkit-align-content: flex-start !important;\n    -ms-flex-line-pack: start !important;\n    align-content: flex-start !important;\n  }\n  .align-content-md-end {\n    -webkit-align-content: flex-end !important;\n    -ms-flex-line-pack: end !important;\n    align-content: flex-end !important;\n  }\n  .align-content-md-center {\n    -webkit-align-content: center !important;\n    -ms-flex-line-pack: center !important;\n    align-content: center !important;\n  }\n  .align-content-md-between {\n    -webkit-align-content: space-between !important;\n    -ms-flex-line-pack: justify !important;\n    align-content: space-between !important;\n  }\n  .align-content-md-around {\n    -webkit-align-content: space-around !important;\n    -ms-flex-line-pack: distribute !important;\n    align-content: space-around !important;\n  }\n  .align-content-md-stretch {\n    -webkit-align-content: stretch !important;\n    -ms-flex-line-pack: stretch !important;\n    align-content: stretch !important;\n  }\n  .align-self-md-auto {\n    -webkit-align-self: auto !important;\n    -ms-flex-item-align: auto !important;\n    align-self: auto !important;\n  }\n  .align-self-md-start {\n    -webkit-align-self: flex-start !important;\n    -ms-flex-item-align: start !important;\n    align-self: flex-start !important;\n  }\n  .align-self-md-end {\n    -webkit-align-self: flex-end !important;\n    -ms-flex-item-align: end !important;\n    align-self: flex-end !important;\n  }\n  .align-self-md-center {\n    -webkit-align-self: center !important;\n    -ms-flex-item-align: center !important;\n    align-self: center !important;\n  }\n  .align-self-md-baseline {\n    -webkit-align-self: baseline !important;\n    -ms-flex-item-align: baseline !important;\n    align-self: baseline !important;\n  }\n  .align-self-md-stretch {\n    -webkit-align-self: stretch !important;\n    -ms-flex-item-align: stretch !important;\n    align-self: stretch !important;\n  }\n}\n@media (min-width: 992px) {\n  .order-lg-first {\n    -webkit-box-ordinal-group: 0;\n    -webkit-order: -1;\n    -ms-flex-order: -1;\n    order: -1;\n  }\n  .order-lg-last {\n    -webkit-box-ordinal-group: 2;\n    -webkit-order: 1;\n    -ms-flex-order: 1;\n    order: 1;\n  }\n  .order-lg-0 {\n    -webkit-box-ordinal-group: 1;\n    -webkit-order: 0;\n    -ms-flex-order: 0;\n    order: 0;\n  }\n  .flex-lg-row {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: row !important;\n    -ms-flex-direction: row !important;\n    flex-direction: row !important;\n  }\n  .flex-lg-column {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: column !important;\n    -ms-flex-direction: column !important;\n    flex-direction: column !important;\n  }\n  .flex-lg-row-reverse {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: row-reverse !important;\n    -ms-flex-direction: row-reverse !important;\n    flex-direction: row-reverse !important;\n  }\n  .flex-lg-column-reverse {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: column-reverse !important;\n    -ms-flex-direction: column-reverse !important;\n    flex-direction: column-reverse !important;\n  }\n  .flex-lg-wrap {\n    -webkit-flex-wrap: wrap !important;\n    -ms-flex-wrap: wrap !important;\n    flex-wrap: wrap !important;\n  }\n  .flex-lg-nowrap {\n    -webkit-flex-wrap: nowrap !important;\n    -ms-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n  }\n  .flex-lg-wrap-reverse {\n    -webkit-flex-wrap: wrap-reverse !important;\n    -ms-flex-wrap: wrap-reverse !important;\n    flex-wrap: wrap-reverse !important;\n  }\n  .justify-content-lg-start {\n    -webkit-box-pack: start !important;\n    -webkit-justify-content: flex-start !important;\n    -ms-flex-pack: start !important;\n    justify-content: flex-start !important;\n  }\n  .justify-content-lg-end {\n    -webkit-box-pack: end !important;\n    -webkit-justify-content: flex-end !important;\n    -ms-flex-pack: end !important;\n    justify-content: flex-end !important;\n  }\n  .justify-content-lg-center {\n    -webkit-box-pack: center !important;\n    -webkit-justify-content: center !important;\n    -ms-flex-pack: center !important;\n    justify-content: center !important;\n  }\n  .justify-content-lg-between {\n    -webkit-box-pack: justify !important;\n    -webkit-justify-content: space-between !important;\n    -ms-flex-pack: justify !important;\n    justify-content: space-between !important;\n  }\n  .justify-content-lg-around {\n    -webkit-justify-content: space-around !important;\n    -ms-flex-pack: distribute !important;\n    justify-content: space-around !important;\n  }\n  .align-items-lg-start {\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    -ms-flex-align: start !important;\n    align-items: flex-start !important;\n  }\n  .align-items-lg-end {\n    -webkit-box-align: end !important;\n    -webkit-align-items: flex-end !important;\n    -ms-flex-align: end !important;\n    align-items: flex-end !important;\n  }\n  .align-items-lg-center {\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    -ms-flex-align: center !important;\n    align-items: center !important;\n  }\n  .align-items-lg-baseline {\n    -webkit-box-align: baseline !important;\n    -webkit-align-items: baseline !important;\n    -ms-flex-align: baseline !important;\n    align-items: baseline !important;\n  }\n  .align-items-lg-stretch {\n    -webkit-box-align: stretch !important;\n    -webkit-align-items: stretch !important;\n    -ms-flex-align: stretch !important;\n    align-items: stretch !important;\n  }\n  .align-content-lg-start {\n    -webkit-align-content: flex-start !important;\n    -ms-flex-line-pack: start !important;\n    align-content: flex-start !important;\n  }\n  .align-content-lg-end {\n    -webkit-align-content: flex-end !important;\n    -ms-flex-line-pack: end !important;\n    align-content: flex-end !important;\n  }\n  .align-content-lg-center {\n    -webkit-align-content: center !important;\n    -ms-flex-line-pack: center !important;\n    align-content: center !important;\n  }\n  .align-content-lg-between {\n    -webkit-align-content: space-between !important;\n    -ms-flex-line-pack: justify !important;\n    align-content: space-between !important;\n  }\n  .align-content-lg-around {\n    -webkit-align-content: space-around !important;\n    -ms-flex-line-pack: distribute !important;\n    align-content: space-around !important;\n  }\n  .align-content-lg-stretch {\n    -webkit-align-content: stretch !important;\n    -ms-flex-line-pack: stretch !important;\n    align-content: stretch !important;\n  }\n  .align-self-lg-auto {\n    -webkit-align-self: auto !important;\n    -ms-flex-item-align: auto !important;\n    align-self: auto !important;\n  }\n  .align-self-lg-start {\n    -webkit-align-self: flex-start !important;\n    -ms-flex-item-align: start !important;\n    align-self: flex-start !important;\n  }\n  .align-self-lg-end {\n    -webkit-align-self: flex-end !important;\n    -ms-flex-item-align: end !important;\n    align-self: flex-end !important;\n  }\n  .align-self-lg-center {\n    -webkit-align-self: center !important;\n    -ms-flex-item-align: center !important;\n    align-self: center !important;\n  }\n  .align-self-lg-baseline {\n    -webkit-align-self: baseline !important;\n    -ms-flex-item-align: baseline !important;\n    align-self: baseline !important;\n  }\n  .align-self-lg-stretch {\n    -webkit-align-self: stretch !important;\n    -ms-flex-item-align: stretch !important;\n    align-self: stretch !important;\n  }\n}\n@media (min-width: 1200px) {\n  .order-xl-first {\n    -webkit-box-ordinal-group: 0;\n    -webkit-order: -1;\n    -ms-flex-order: -1;\n    order: -1;\n  }\n  .order-xl-last {\n    -webkit-box-ordinal-group: 2;\n    -webkit-order: 1;\n    -ms-flex-order: 1;\n    order: 1;\n  }\n  .order-xl-0 {\n    -webkit-box-ordinal-group: 1;\n    -webkit-order: 0;\n    -ms-flex-order: 0;\n    order: 0;\n  }\n  .flex-xl-row {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: row !important;\n    -ms-flex-direction: row !important;\n    flex-direction: row !important;\n  }\n  .flex-xl-column {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: normal !important;\n    -webkit-flex-direction: column !important;\n    -ms-flex-direction: column !important;\n    flex-direction: column !important;\n  }\n  .flex-xl-row-reverse {\n    -webkit-box-orient: horizontal !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: row-reverse !important;\n    -ms-flex-direction: row-reverse !important;\n    flex-direction: row-reverse !important;\n  }\n  .flex-xl-column-reverse {\n    -webkit-box-orient: vertical !important;\n    -webkit-box-direction: reverse !important;\n    -webkit-flex-direction: column-reverse !important;\n    -ms-flex-direction: column-reverse !important;\n    flex-direction: column-reverse !important;\n  }\n  .flex-xl-wrap {\n    -webkit-flex-wrap: wrap !important;\n    -ms-flex-wrap: wrap !important;\n    flex-wrap: wrap !important;\n  }\n  .flex-xl-nowrap {\n    -webkit-flex-wrap: nowrap !important;\n    -ms-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n  }\n  .flex-xl-wrap-reverse {\n    -webkit-flex-wrap: wrap-reverse !important;\n    -ms-flex-wrap: wrap-reverse !important;\n    flex-wrap: wrap-reverse !important;\n  }\n  .justify-content-xl-start {\n    -webkit-box-pack: start !important;\n    -webkit-justify-content: flex-start !important;\n    -ms-flex-pack: start !important;\n    justify-content: flex-start !important;\n  }\n  .justify-content-xl-end {\n    -webkit-box-pack: end !important;\n    -webkit-justify-content: flex-end !important;\n    -ms-flex-pack: end !important;\n    justify-content: flex-end !important;\n  }\n  .justify-content-xl-center {\n    -webkit-box-pack: center !important;\n    -webkit-justify-content: center !important;\n    -ms-flex-pack: center !important;\n    justify-content: center !important;\n  }\n  .justify-content-xl-between {\n    -webkit-box-pack: justify !important;\n    -webkit-justify-content: space-between !important;\n    -ms-flex-pack: justify !important;\n    justify-content: space-between !important;\n  }\n  .justify-content-xl-around {\n    -webkit-justify-content: space-around !important;\n    -ms-flex-pack: distribute !important;\n    justify-content: space-around !important;\n  }\n  .align-items-xl-start {\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    -ms-flex-align: start !important;\n    align-items: flex-start !important;\n  }\n  .align-items-xl-end {\n    -webkit-box-align: end !important;\n    -webkit-align-items: flex-end !important;\n    -ms-flex-align: end !important;\n    align-items: flex-end !important;\n  }\n  .align-items-xl-center {\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    -ms-flex-align: center !important;\n    align-items: center !important;\n  }\n  .align-items-xl-baseline {\n    -webkit-box-align: baseline !important;\n    -webkit-align-items: baseline !important;\n    -ms-flex-align: baseline !important;\n    align-items: baseline !important;\n  }\n  .align-items-xl-stretch {\n    -webkit-box-align: stretch !important;\n    -webkit-align-items: stretch !important;\n    -ms-flex-align: stretch !important;\n    align-items: stretch !important;\n  }\n  .align-content-xl-start {\n    -webkit-align-content: flex-start !important;\n    -ms-flex-line-pack: start !important;\n    align-content: flex-start !important;\n  }\n  .align-content-xl-end {\n    -webkit-align-content: flex-end !important;\n    -ms-flex-line-pack: end !important;\n    align-content: flex-end !important;\n  }\n  .align-content-xl-center {\n    -webkit-align-content: center !important;\n    -ms-flex-line-pack: center !important;\n    align-content: center !important;\n  }\n  .align-content-xl-between {\n    -webkit-align-content: space-between !important;\n    -ms-flex-line-pack: justify !important;\n    align-content: space-between !important;\n  }\n  .align-content-xl-around {\n    -webkit-align-content: space-around !important;\n    -ms-flex-line-pack: distribute !important;\n    align-content: space-around !important;\n  }\n  .align-content-xl-stretch {\n    -webkit-align-content: stretch !important;\n    -ms-flex-line-pack: stretch !important;\n    align-content: stretch !important;\n  }\n  .align-self-xl-auto {\n    -webkit-align-self: auto !important;\n    -ms-flex-item-align: auto !important;\n    align-self: auto !important;\n  }\n  .align-self-xl-start {\n    -webkit-align-self: flex-start !important;\n    -ms-flex-item-align: start !important;\n    align-self: flex-start !important;\n  }\n  .align-self-xl-end {\n    -webkit-align-self: flex-end !important;\n    -ms-flex-item-align: end !important;\n    align-self: flex-end !important;\n  }\n  .align-self-xl-center {\n    -webkit-align-self: center !important;\n    -ms-flex-item-align: center !important;\n    align-self: center !important;\n  }\n  .align-self-xl-baseline {\n    -webkit-align-self: baseline !important;\n    -ms-flex-item-align: baseline !important;\n    align-self: baseline !important;\n  }\n  .align-self-xl-stretch {\n    -webkit-align-self: stretch !important;\n    -ms-flex-item-align: stretch !important;\n    align-self: stretch !important;\n  }\n}";
	n(css$1,{});

	var css = "/**\n * Copyright (c) 2024 Anthony Mugendi\n * \n * This software is released under the MIT License.\n * https://opensource.org/licenses/MIT\n */\n.former .control-group {\n  padding: 10px;\n  border-radius: 10px;\n  border: 1px solid #f9f9f9;\n  margin: 5px 0;\n}\n.former .control-group .label-container {\n  display: flex;\n  justify-content: space-between;\n  align-items: end;\n  margin-bottom: 5px;\n}\n.former .control-group .label-container label {\n  font-size: 1.2rem;\n  font-weight: 600;\n  margin-right: 10px;\n}\n.former .control-group:hover {\n  background: #f9f9f9;\n}\n.former .control-group.hidden {\n  display: none;\n}\n.former .control-group.has-error {\n  background: #fee;\n  color: #922;\n}\n.former .control-group.has-error:hover {\n  background: #fee;\n}\n.former .control-group.has-error .label-container .error {\n  font-size: 0.7rem;\n}\n.former .control-group textarea {\n  min-height: 200px;\n}\n.former .control-group input,\n.former .control-group textarea,\n.former .control-group select {\n  display: block;\n  padding: 5px;\n  border: none;\n  outline: none;\n  box-sizing: border-box;\n  font-size: 1.1rem;\n  color: #444;\n  background: #fff;\n  box-shadow: rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px;\n  border-radius: 5px;\n  width: 100%;\n}\n.former .control-group input[placeholder],\n.former .control-group textarea[placeholder],\n.former .control-group select[placeholder] {\n  color: #999;\n}\n.former .control-group input[disabled],\n.former .control-group textarea[disabled],\n.former .control-group select[disabled] {\n  background: #f5f5f5;\n  cursor: crosshair;\n}\n.former .control-group input[type=radio],\n.former .control-group input[type=checkbox] {\n  display: inline-block;\n  width: auto;\n  box-shadow: none;\n}\n.former .control-group select {\n  appearance: none;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16px' height='16px' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6.1018 8C5.02785 8 4.45387 9.2649 5.16108 10.0731L10.6829 16.3838C11.3801 17.1806 12.6197 17.1806 13.3169 16.3838L18.8388 10.0731C19.5459 9.2649 18.972 8 17.898 8H6.1018Z' fill='%23212121'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat;\n  background-position: right 0.5rem center;\n}\n.former button {\n  background-color: #eee;\n  border-radius: 8px;\n  box-sizing: border-box;\n  color: #222222;\n  cursor: pointer;\n  display: inline-block;\n  font-size: 16px;\n  font-weight: 600;\n  line-height: 20px;\n  margin: 0;\n  outline: none;\n  padding: 13px 23px;\n  position: relative;\n  text-align: center;\n  text-decoration: none;\n  touch-action: manipulation;\n  transition: box-shadow 0.2s, -ms-transform 0.1s, -webkit-transform 0.1s, transform 0.1s;\n  user-select: none;\n  -webkit-user-select: none;\n  width: auto;\n}\n.former button:hover, .former button:active {\n  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;\n  filter: brightness(120%);\n}\n.former button:disabled {\n  border-color: #dddddd;\n  color: #dddddd;\n  cursor: not-allowed;\n  opacity: 1;\n}\n\n@media (max-width: 575px) {\n  .former .control-group:hover {\n    background: #f9f9f9;\n  }\n  .former .control-group .label-container {\n    flex-direction: column;\n    align-items: start;\n  }\n}";
	n(css,{});

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var index_min = {exports: {}};

	(function (module, exports) {
	var g=g||{};g.scope={};g.arrayIteratorImpl=function(e){var h=0;return function(){return h<e.length?{done:!1,value:e[h++]}:{done:!0}}};g.arrayIterator=function(e){return {next:g.arrayIteratorImpl(e)}};g.ASSUME_ES5=!1;g.ASSUME_NO_NATIVE_MAP=!1;g.ASSUME_NO_NATIVE_SET=!1;g.SIMPLE_FROUND_POLYFILL=!1;g.ISOLATE_POLYFILLS=!1;g.FORCE_POLYFILL_PROMISE=!1;g.FORCE_POLYFILL_PROMISE_WHEN_NO_UNHANDLED_REJECTION=!1;
		g.defineProperty=g.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(e,h,m){if(e==Array.prototype||e==Object.prototype)return e;e[h]=m.value;return e};g.getGlobal=function(e){e=["object"==typeof globalThis&&globalThis,e,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof commonjsGlobal&&commonjsGlobal];for(var h=0;h<e.length;++h){var m=e[h];if(m&&m.Math==Math)return m}throw Error("Cannot find global object");};g.global=g.getGlobal(commonjsGlobal);
		g.IS_SYMBOL_NATIVE="function"===typeof Symbol&&"symbol"===typeof Symbol("x");g.TRUST_ES6_POLYFILLS=!g.ISOLATE_POLYFILLS||g.IS_SYMBOL_NATIVE;g.polyfills={};g.propertyToPolyfillSymbol={};g.POLYFILL_PREFIX="$jscp$";g.polyfill=function(e,h,m,n){h&&(g.ISOLATE_POLYFILLS?g.polyfillIsolated(e,h,m,n):g.polyfillUnisolated(e,h,m,n));};
		g.polyfillUnisolated=function(e,h){var m=g.global;e=e.split(".");for(var n=0;n<e.length-1;n++){var t=e[n];if(!(t in m))return;m=m[t];}e=e[e.length-1];n=m[e];h=h(n);h!=n&&null!=h&&g.defineProperty(m,e,{configurable:!0,writable:!0,value:h});};
		g.polyfillIsolated=function(e,h,m){var n=e.split(".");e=1===n.length;var t=n[0];t=!e&&t in g.polyfills?g.polyfills:g.global;for(var w=0;w<n.length-1;w++){var x=n[w];if(!(x in t))return;t=t[x];}n=n[n.length-1];m=g.IS_SYMBOL_NATIVE&&"es6"===m?t[n]:null;h=h(m);null!=h&&(e?g.defineProperty(g.polyfills,n,{configurable:!0,writable:!0,value:h}):h!==m&&(void 0===g.propertyToPolyfillSymbol[n]&&(e=1E9*Math.random()>>>0,g.propertyToPolyfillSymbol[n]=g.IS_SYMBOL_NATIVE?g.global.Symbol(n):g.POLYFILL_PREFIX+e+"$"+
		n),g.defineProperty(t,g.propertyToPolyfillSymbol[n],{configurable:!0,writable:!0,value:h})));};g.initSymbol=function(){};
		g.polyfill("Symbol",function(e){function h(w){if(this instanceof h)throw new TypeError("Symbol is not a constructor");return new m(n+(w||"")+"_"+t++,w)}function m(w,x){this.$jscomp$symbol$id_=w;g.defineProperty(this,"description",{configurable:!0,writable:!0,value:x});}if(e)return e;m.prototype.toString=function(){return this.$jscomp$symbol$id_};var n="jscomp_symbol_"+(1E9*Math.random()>>>0)+"_",t=0;return h},"es6","es3");
		g.polyfill("Symbol.iterator",function(e){if(e)return e;e=Symbol("Symbol.iterator");for(var h="Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "),m=0;m<h.length;m++){var n=g.global[h[m]];"function"===typeof n&&"function"!=typeof n.prototype[e]&&g.defineProperty(n.prototype,e,{configurable:!0,writable:!0,value:function(){return g.iteratorPrototype(g.arrayIteratorImpl(this))}});}return e},"es6","es3");
		g.iteratorPrototype=function(e){e={next:e};e[Symbol.iterator]=function(){return this};return e};g.iteratorFromArray=function(e,h){e instanceof String&&(e+="");var m=0,n=!1,t={next:function(){if(!n&&m<e.length){var w=m++;return {value:h(w,e[w]),done:!1}}n=!0;return {done:!0,value:void 0}}};t[Symbol.iterator]=function(){return t};return t};g.polyfill("Array.prototype.keys",function(e){return e?e:function(){return g.iteratorFromArray(this,function(h){return h})}},"es6","es3");
		g.polyfill("Array.prototype.values",function(e){return e?e:function(){return g.iteratorFromArray(this,function(h,m){return m})}},"es8","es3");g.checkStringArgs=function(e,h,m){if(null==e)throw new TypeError("The 'this' value for String.prototype."+m+" must not be null or undefined");if(h instanceof RegExp)throw new TypeError("First argument to String.prototype."+m+" must not be a regular expression");return e+""};
		g.polyfill("String.prototype.startsWith",function(e){return e?e:function(h,m){var n=g.checkStringArgs(this,h,"startsWith");h+="";var t=n.length,w=h.length;m=Math.max(0,Math.min(m|0,n.length));for(var x=0;x<w&&m<t;)if(n[m++]!=h[x++])return !1;return x>=w}},"es6","es3");g.owns=function(e,h){return Object.prototype.hasOwnProperty.call(e,h)};
		g.assign=g.TRUST_ES6_POLYFILLS&&"function"==typeof Object.assign?Object.assign:function(e,h){for(var m=1;m<arguments.length;m++){var n=arguments[m];if(n)for(var t in n)g.owns(n,t)&&(e[t]=n[t]);}return e};g.polyfill("Object.assign",function(e){return e||g.assign},"es6","es3");g.checkEs6ConformanceViaProxy=function(){try{var e={},h=Object.create(new g.global.Proxy(e,{get:function(m,n,t){return m==e&&"q"==n&&t==h}}));return !0===h.q}catch(m){return !1}};g.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS=!1;
		g.ES6_CONFORMANCE=g.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS&&g.checkEs6ConformanceViaProxy();g.makeIterator=function(e){var h="undefined"!=typeof Symbol&&Symbol.iterator&&e[Symbol.iterator];return h?h.call(e):g.arrayIterator(e)};
		g.polyfill("WeakMap",function(e){function h(l){this.id_=(p+=Math.random()+1).toString();if(l){l=g.makeIterator(l);for(var q;!(q=l.next()).done;)q=q.value,this.set(q[0],q[1]);}}function m(){if(!e||!Object.seal)return !1;try{var l=Object.seal({}),q=Object.seal({}),v=new e([[l,2],[q,3]]);if(2!=v.get(l)||3!=v.get(q))return !1;v.delete(l);v.set(q,4);return !v.has(l)&&4==v.get(q)}catch(B){return !1}}function n(){}function t(l){var q=typeof l;return "object"===q&&null!==l||"function"===q}function w(l){if(!g.owns(l,
		y)){var q=new n;g.defineProperty(l,y,{value:q});}}function x(l){if(!g.ISOLATE_POLYFILLS){var q=Object[l];q&&(Object[l]=function(v){if(v instanceof n)return v;Object.isExtensible(v)&&w(v);return q(v)});}}if(g.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS){if(e&&g.ES6_CONFORMANCE)return e}else if(m())return e;var y="$jscomp_hidden_"+Math.random();x("freeze");x("preventExtensions");x("seal");var p=0;h.prototype.set=function(l,q){if(!t(l))throw Error("Invalid WeakMap key");w(l);if(!g.owns(l,y))throw Error("WeakMap key fail: "+
		l);l[y][this.id_]=q;return this};h.prototype.get=function(l){return t(l)&&g.owns(l,y)?l[y][this.id_]:void 0};h.prototype.has=function(l){return t(l)&&g.owns(l,y)&&g.owns(l[y],this.id_)};h.prototype.delete=function(l){return t(l)&&g.owns(l,y)&&g.owns(l[y],this.id_)?delete l[y][this.id_]:!1};return h},"es6","es3");g.MapEntry=function(){};
		g.polyfill("Map",function(e){function h(){var p={};return p.previous=p.next=p.head=p}function m(p,l){var q=p.head_;return g.iteratorPrototype(function(){if(q){for(;q.head!=p.head_;)q=q.previous;for(;q.next!=q.head;)return q=q.next,{done:!1,value:l(q)};q=null;}return {done:!0,value:void 0}})}function n(p,l){var q=l&&typeof l;"object"==q||"function"==q?x.has(l)?q=x.get(l):(q=""+ ++y,x.set(l,q)):q="p_"+l;var v=p.data_[q];if(v&&g.owns(p.data_,q))for(p=0;p<v.length;p++){var B=v[p];if(l!==l&&B.key!==B.key||
		l===B.key)return {id:q,list:v,index:p,entry:B}}return {id:q,list:v,index:-1,entry:void 0}}function t(p){this.data_={};this.head_=h();this.size=0;if(p){p=g.makeIterator(p);for(var l;!(l=p.next()).done;)l=l.value,this.set(l[0],l[1]);}}function w(){if(g.ASSUME_NO_NATIVE_MAP||!e||"function"!=typeof e||!e.prototype.entries||"function"!=typeof Object.seal)return !1;try{var p=Object.seal({x:4}),l=new e(g.makeIterator([[p,"s"]]));if("s"!=l.get(p)||1!=l.size||l.get({x:4})||l.set({x:4},"t")!=l||2!=l.size)return !1;
		var q=l.entries(),v=q.next();if(v.done||v.value[0]!=p||"s"!=v.value[1])return !1;v=q.next();return v.done||4!=v.value[0].x||"t"!=v.value[1]||!q.next().done?!1:!0}catch(B){return !1}}if(g.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS){if(e&&g.ES6_CONFORMANCE)return e}else if(w())return e;var x=new WeakMap;t.prototype.set=function(p,l){p=0===p?0:p;var q=n(this,p);q.list||(q.list=this.data_[q.id]=[]);q.entry?q.entry.value=l:(q.entry={next:this.head_,previous:this.head_.previous,head:this.head_,key:p,value:l},q.list.push(q.entry),
		this.head_.previous.next=q.entry,this.head_.previous=q.entry,this.size++);return this};t.prototype.delete=function(p){p=n(this,p);return p.entry&&p.list?(p.list.splice(p.index,1),p.list.length||delete this.data_[p.id],p.entry.previous.next=p.entry.next,p.entry.next.previous=p.entry.previous,p.entry.head=null,this.size--,!0):!1};t.prototype.clear=function(){this.data_={};this.head_=this.head_.previous=h();this.size=0;};t.prototype.has=function(p){return !!n(this,p).entry};t.prototype.get=function(p){return (p=
		n(this,p).entry)&&p.value};t.prototype.entries=function(){return m(this,function(p){return [p.key,p.value]})};t.prototype.keys=function(){return m(this,function(p){return p.key})};t.prototype.values=function(){return m(this,function(p){return p.value})};t.prototype.forEach=function(p,l){for(var q=this.entries(),v;!(v=q.next()).done;)v=v.value,p.call(l,v[1],v[0],this);};t.prototype[Symbol.iterator]=t.prototype.entries;var y=0;return t},"es6","es3");
		g.polyfill("String.prototype.endsWith",function(e){return e?e:function(h,m){var n=g.checkStringArgs(this,h,"endsWith");h+="";void 0===m&&(m=n.length);m=Math.max(0,Math.min(m|0,n.length));for(var t=h.length;0<t&&0<m;)if(n[--m]!=h[--t])return !1;return 0>=t}},"es6","es3");g.polyfill("Number.isNaN",function(e){return e?e:function(h){return "number"===typeof h&&isNaN(h)}},"es6","es3");
		g.polyfill("Object.entries",function(e){return e?e:function(h){var m=[],n;for(n in h)g.owns(h,n)&&m.push([n,h[n]]);return m}},"es8","es3");	function H(){function e(a){this.opts={};this.defaults={};this.messages=Object.assign({},r);this.rules={any:S,array:T,boolean:U,class:V,custom:W,currency:X,date:Y,email:Z,enum:aa,equal:ba,forbidden:ca,function:da,multi:B,number:v,object:q,objectID:l,record:p,string:y,tuple:x,url:w,uuid:t,mac:n,luhn:m};this.aliases={};this.cache=new Map;if(a){A(this.opts,a);a.defaults&&A(this.defaults,a.defaults);if(a.messages)for(var b in a.messages)this.addMessage(b,a.messages[b]);if(a.aliases)for(var c in a.aliases)this.alias(c,
		a.aliases[c]);if(a.customRules)for(var d in a.customRules)this.add(d,a.customRules[d]);if(a.plugins){a=a.plugins;if(!Array.isArray(a))throw Error("Plugins type must be array");a.forEach(this.plugin.bind(this));}this.opts.debug&&(a=function(f){return f},"undefined"===typeof window&&(a=h),this._formatter=a);}}function h(a){I||(I=N(),O={parser:"babel",useTabs:!1,printWidth:120,trailingComma:"none",tabWidth:4,singleQuote:!1,semi:!0,bracketSpacing:!0},J=N(),P={language:"js",theme:J.fromJson({keyword:["white",
		"bold"],built_in:"magenta",literal:"cyan",number:"magenta",regexp:"red",string:["yellow","bold"],symbol:"plain",class:"blue",attr:"plain",function:["white","bold"],title:"plain",params:"green",comment:"grey"})});a=I.format(a,O);return J.highlight(a,P)}function m(a){a.schema;a=a.messages;return {source:'\n\t\t\tif (typeof value !== "string") {\n\t\t\t\t'+this.makeError({type:"string",actual:"value",messages:a})+'\n\t\t\t\treturn value;\n\t\t\t}\n\n\t\t\tif (typeof value !== "string")\n\t\t\t\tvalue = String(value);\n\n\t\t\tval = value.replace(/\\D+/g, "");\n\n\t\t\tvar array = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];\n\t\t\tvar len = val ? val.length : 0,\n\t\t\t\tbit = 1,\n\t\t\t\tsum = 0;\n\t\t\twhile (len--) {\n\t\t\t\tsum += !(bit ^= 1) ? parseInt(val[len], 10) : array[val[len]];\n\t\t\t}\n\n\t\t\tif (!(sum % 10 === 0 && sum > 0)) {\n\t\t\t\t'+
		this.makeError({type:"luhn",actual:"value",messages:a})+"\n\t\t\t}\n\n\t\t\treturn value;\n\t\t"}}function n(a){a.schema;a=a.messages;return {source:'\n\t\t\tif (typeof value !== "string") {\n\t\t\t\t'+this.makeError({type:"string",actual:"value",messages:a})+"\n\t\t\t\treturn value;\n\t\t\t}\n\n\t\t\tvar v = value.toLowerCase();\n\t\t\tif (!"+ea.toString()+".test(v)) {\n\t\t\t\t"+this.makeError({type:"mac",actual:"value",messages:a})+"\n\t\t\t}\n\t\t\t\n\t\t\treturn value;\n\t\t"}}function t(a){var b=
		a.schema;a=a.messages;var c=[];c.push('\n\t\tif (typeof value !== "string") {\n\t\t\t'+this.makeError({type:"string",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\n\t\tvar val = value.toLowerCase();\n\t\tif (!"+fa.toString()+".test(val)) {\n\t\t\t"+this.makeError({type:"uuid",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\n\t\tconst version = val.charAt(14) | 0;\n\t");7>parseInt(b.version)&&c.push("\n\t\t\tif ("+b.version+" !== version) {\n\t\t\t\t"+this.makeError({type:"uuidVersion",
		expected:b.version,actual:"version",messages:a})+"\n\t\t\t\treturn value;\n\t\t\t}\n\t\t");c.push('\n\t\tswitch (version) {\n\t\tcase 0:\n\t\tcase 1:\n\t\tcase 2:\n\t\tcase 6:\n\t\t\tbreak;\n\t\tcase 3:\n\t\tcase 4:\n\t\tcase 5:\n\t\t\tif (["8", "9", "a", "b"].indexOf(val.charAt(19)) === -1) {\n\t\t\t\t'+this.makeError({type:"uuid",actual:"value",messages:a})+"\n\t\t\t}\n\t\t}\n\n\t\treturn value;\n\t");return {source:c.join("\n")}}function w(a){var b=a.schema;a=a.messages;var c=[];c.push('\n\t\tif (typeof value !== "string") {\n\t\t\t'+
		this.makeError({type:"string",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\t");b.empty?c.push("\n\t\t\tif (value.length === 0) return value;\n\t\t"):c.push("\n\t\t\tif (value.length === 0) {\n\t\t\t\t"+this.makeError({type:"urlEmpty",actual:"value",messages:a})+"\n\t\t\t\treturn value;\n\t\t\t}\n\t\t");c.push("\n\t\tif (!"+ha.toString()+".test(value)) {\n\t\t\t"+this.makeError({type:"url",actual:"value",messages:a})+"\n\t\t}\n\n\t\treturn value;\n\t");return {source:c.join("\n")}}function x(a,
		b,c){var d=a.schema,f=a.messages;a=[];if(null!=d.items){if(!Array.isArray(d.items))throw Error("Invalid '"+d.type+"' schema. The 'items' field must be an array.");if(0===d.items.length)throw Error("Invalid '"+d.type+"' schema. The 'items' field must not be an empty array.");}a.push("\n\t\tif (!Array.isArray(value)) {\n\t\t\t"+this.makeError({type:"tuple",actual:"value",messages:f})+"\n\t\t\treturn value;\n\t\t}\n\n\t\tvar len = value.length;\n\t");!1===d.empty&&a.push("\n\t\t\tif (len === 0) {\n\t\t\t\t"+
		this.makeError({type:"tupleEmpty",actual:"value",messages:f})+"\n\t\t\t\treturn value;\n\t\t\t}\n\t\t");if(null!=d.items){a.push("\n\t\t\tif ("+d.empty+" !== false && len === 0) {\n\t\t\t\treturn value;\n\t\t\t}\n\n\t\t\tif (len !== "+d.items.length+") {\n\t\t\t\t"+this.makeError({type:"tupleLength",expected:d.items.length,actual:"len",messages:f})+"\n\t\t\t\treturn value;\n\t\t\t}\n\t\t");a.push("\n\t\t\tvar arr = value;\n\t\t\tvar parentField = field;\n\t\t");for(f=0;f<d.items.length;f++){a.push("\n\t\t\tvalue = arr["+
		f+"];\n\t\t");var k=b+"["+f+"]",u=this.getRuleFromSchema(d.items[f]);a.push(this.compileRule(u,c,k,"\n\t\t\tarr["+f+"] = "+(c.async?"await ":"")+"context.fn[%%INDEX%%](arr["+f+'], (parentField ? parentField : "") + "[" + '+f+' + "]", parent, errors, context);\n\t\t',"arr["+f+"]"));}a.push("\n\t\treturn arr;\n\t");}else a.push("\n\t\treturn value;\n\t");return {source:a.join("\n")}}function y(a){var b=a.schema;a=a.messages;var c=[],d=!1;!0===b.convert&&(d=!0,c.push('\n\t\t\tif (typeof value !== "string") {\n\t\t\t\tvalue = String(value);\n\t\t\t}\n\t\t'));
		c.push('\n\t\tif (typeof value !== "string") {\n\t\t\t'+this.makeError({type:"string",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\n\t\tvar origValue = value;\n\t");b.trim&&(d=!0,c.push("\n\t\t\tvalue = value.trim();\n\t\t"));b.trimLeft&&(d=!0,c.push("\n\t\t\tvalue = value.trimLeft();\n\t\t"));b.trimRight&&(d=!0,c.push("\n\t\t\tvalue = value.trimRight();\n\t\t"));b.padStart&&(d=!0,c.push("\n\t\t\tvalue = value.padStart("+b.padStart+", "+JSON.stringify(null!=b.padChar?b.padChar:" ")+
		");\n\t\t"));b.padEnd&&(d=!0,c.push("\n\t\t\tvalue = value.padEnd("+b.padEnd+", "+JSON.stringify(null!=b.padChar?b.padChar:" ")+");\n\t\t"));b.lowercase&&(d=!0,c.push("\n\t\t\tvalue = value.toLowerCase();\n\t\t"));b.uppercase&&(d=!0,c.push("\n\t\t\tvalue = value.toUpperCase();\n\t\t"));b.localeLowercase&&(d=!0,c.push("\n\t\t\tvalue = value.toLocaleLowerCase();\n\t\t"));b.localeUppercase&&(d=!0,c.push("\n\t\t\tvalue = value.toLocaleUpperCase();\n\t\t"));c.push("\n\t\t\tvar len = value.length;\n\t");
		!1===b.empty?c.push("\n\t\t\tif (len === 0) {\n\t\t\t\t"+this.makeError({type:"stringEmpty",actual:"value",messages:a})+"\n\t\t\t}\n\t\t"):!0===b.empty&&c.push("\n\t\t\tif (len === 0) {\n\t\t\t\treturn value;\n\t\t\t}\n\t\t");null!=b.min&&c.push("\n\t\t\tif (len < "+b.min+") {\n\t\t\t\t"+this.makeError({type:"stringMin",expected:b.min,actual:"len",messages:a})+"\n\t\t\t}\n\t\t");null!=b.max&&c.push("\n\t\t\tif (len > "+b.max+") {\n\t\t\t\t"+this.makeError({type:"stringMax",expected:b.max,actual:"len",
		messages:a})+"\n\t\t\t}\n\t\t");null!=b.length&&c.push("\n\t\t\tif (len !== "+b.length+") {\n\t\t\t\t"+this.makeError({type:"stringLength",expected:b.length,actual:"len",messages:a})+"\n\t\t\t}\n\t\t");if(null!=b.pattern){var f=b.pattern;"string"==typeof b.pattern&&(f=new RegExp(b.pattern,b.patternFlags));c.push("\n\t\t\tif (!"+f.toString()+".test(value)) {\n\t\t\t\t"+this.makeError({type:"stringPattern",expected:'"'+f.toString().replace(/"/g,"\\$&")+'"',actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");}null!=
		b.contains&&c.push('\n\t\t\tif (value.indexOf("'+b.contains+'") === -1) {\n\t\t\t\t'+this.makeError({type:"stringContains",expected:'"'+b.contains+'"',actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");null!=b.enum&&(f=JSON.stringify(b.enum),c.push("\n\t\t\tif ("+f+".indexOf(value) === -1) {\n\t\t\t\t"+this.makeError({type:"stringEnum",expected:'"'+b.enum.join(", ")+'"',actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t"));!0===b.numeric&&c.push("\n\t\t\tif (!"+ia.toString()+".test(value) ) {\n\t\t\t\t"+
		this.makeError({type:"stringNumeric",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.alpha&&c.push("\n\t\t\tif(!"+ja.toString()+".test(value)) {\n\t\t\t\t"+this.makeError({type:"stringAlpha",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.alphanum&&c.push("\n\t\t\tif(!"+ka.toString()+".test(value)) {\n\t\t\t\t"+this.makeError({type:"stringAlphanum",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.alphadash&&c.push("\n\t\t\tif(!"+la.toString()+".test(value)) {\n\t\t\t\t"+
		this.makeError({type:"stringAlphadash",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.hex&&c.push("\n\t\t\tif(value.length % 2 !== 0 || !"+ma.toString()+".test(value)) {\n\t\t\t\t"+this.makeError({type:"stringHex",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.singleLine&&c.push('\n\t\t\tif(value.includes("\\n")) {\n\t\t\t\t'+this.makeError({type:"stringSingleLine",messages:a})+"\n\t\t\t}\n\t\t");!0===b.base64&&c.push("\n\t\t\tif(!"+na.toString()+".test(value)) {\n\t\t\t\t"+
		this.makeError({type:"stringBase64",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");c.push("\n\t\treturn value;\n\t");return {sanitized:d,source:c.join("\n")}}function p(a,b,c){var d=a.schema,f=[];f.push('\n\t\tif (typeof value !== "object" || value === null || Array.isArray(value)) {\n\t\t\t'+this.makeError({type:"record",actual:"value",messages:a.messages})+"\n\t\t\treturn value;\n\t\t}\n\t");a=d.key||"string";d=d.value||"any";f.push("\n\t\tconst record = value;\n\t\tlet sanitizedKey, sanitizedValue;\n\t\tconst result = {};\n\t\tfor (let key in value) {\n\t");
		f.push("sanitizedKey = value = key;");a=this.getRuleFromSchema(a);for(var k in a.messages)k.startsWith("string")&&(a.messages[k]=a.messages[k].replace(" field "," key "));f.push(this.compileRule(a,c,null,"\n\t\tsanitizedKey = "+(c.async?"await ":"")+'context.fn[%%INDEX%%](key, field ? field + "." + key : key, record, errors, context);\n\t',"sanitizedKey"));f.push("sanitizedValue = value = record[key];");k=this.getRuleFromSchema(d);f.push(this.compileRule(k,c,b+"[key]","\n\t\tsanitizedValue = "+(c.async?
		"await ":"")+'context.fn[%%INDEX%%](value, field ? field + "." + key : key, record, errors, context);\n\t',"sanitizedValue"));f.push("result[sanitizedKey] = sanitizedValue;");f.push("\n\t\t}\n\t");f.push("return result;");return {source:f.join("\n")}}function l(a,b,c){b=a.schema;var d=a.messages;a=a.index;var f=[];c.customs[a]?c.customs[a].schema=b:c.customs[a]={schema:b};f.push("\n\t\tconst ObjectID = context.customs["+a+"].schema.ObjectID;\n\t\tif (!ObjectID.isValid(value)) {\n\t\t\t"+this.makeError({type:"objectID",
		actual:"value",messages:d})+"\n\t\t\treturn;\n\t\t}\n\t");!0===b.convert?f.push("return new ObjectID(value)"):"hexString"===b.convert?f.push("return value.toString()"):f.push("return value");return {source:f.join("\n")}}function q(a,b,c){var d=this,f=a.schema;a=a.messages;var k=[];k.push('\n\t\tif (typeof value !== "object" || value === null || Array.isArray(value)) {\n\t\t\t'+this.makeError({type:"object",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\t");var u=f.properties||f.props;
		if(u){k.push("var parentObj = value;");k.push("var parentField = field;");for(var z=Object.keys(u).filter(function(oa){return !d.isMetaKey(oa)}),C=0;C<z.length;C++){var D=z[C],E=K(D),Q=pa.test(E)?"."+E:"['"+E+"']",L="parentObj"+Q,R=(b?b+".":"")+D,F=u[D].label;F=F?"'"+K(F)+"'":void 0;k.push("\n// Field: "+K(R));k.push('field = parentField ? parentField + "'+Q+'" : "'+E+'";');k.push("value = "+L+";");k.push("label = "+F);D=this.getRuleFromSchema(u[D]);k.push(this.compileRule(D,c,R,"\n\t\t\t\t"+L+" = "+
		(c.async?"await ":"")+"context.fn[%%INDEX%%](value, field, parentObj, errors, context, label);\n\t\t\t",L));!0===this.opts.haltOnFirstError&&k.push("if (errors.length) return parentObj;");}f.strict&&(b=Object.keys(u),k.push("\n\t\t\t\tfield = parentField;\n\t\t\t\tvar invalidProps = [];\n\t\t\t\tvar props = Object.keys(parentObj);\n\n\t\t\t\tfor (let i = 0; i < props.length; i++) {\n\t\t\t\t\tif ("+JSON.stringify(b)+".indexOf(props[i]) === -1) {\n\t\t\t\t\t\tinvalidProps.push(props[i]);\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tif (invalidProps.length) {\n\t\t\t"),
		"remove"===f.strict?(k.push("\n\t\t\t\t\tif (errors.length === 0) {\n\t\t\t\t"),k.push("\n\t\t\t\t\t\tinvalidProps.forEach(function(field) {\n\t\t\t\t\t\t\tdelete parentObj[field];\n\t\t\t\t\t\t});\n\t\t\t\t"),k.push("\n\t\t\t\t\t}\n\t\t\t\t")):k.push("\n\t\t\t\t\t"+this.makeError({type:"objectStrict",expected:'"'+b.join(", ")+'"',actual:"invalidProps.join(', ')",messages:a})+"\n\t\t\t\t"),k.push("\n\t\t\t\t}\n\t\t\t"));}if(null!=f.minProps||null!=f.maxProps)f.strict?k.push("\n\t\t\t\tprops = Object.keys("+
		(u?"parentObj":"value")+");\n\t\t\t"):k.push("\n\t\t\t\tvar props = Object.keys("+(u?"parentObj":"value")+");\n\t\t\t\t"+(u?"field = parentField;":"")+"\n\t\t\t");null!=f.minProps&&k.push("\n\t\t\tif (props.length < "+f.minProps+") {\n\t\t\t\t"+this.makeError({type:"objectMinProps",expected:f.minProps,actual:"props.length",messages:a})+"\n\t\t\t}\n\t\t");null!=f.maxProps&&k.push("\n\t\t\tif (props.length > "+f.maxProps+") {\n\t\t\t\t"+this.makeError({type:"objectMaxProps",expected:f.maxProps,actual:"props.length",
		messages:a})+"\n\t\t\t}\n\t\t");u?k.push("\n\t\t\treturn parentObj;\n\t\t"):k.push("\n\t\t\treturn value;\n\t\t");return {source:k.join("\n")}}function v(a){var b=a.schema;a=a.messages;var c=[];c.push("\n\t\tvar origValue = value;\n\t");var d=!1;!0===b.convert&&(d=!0,c.push('\n\t\t\tif (typeof value !== "number") {\n\t\t\t\tvalue = Number(value);\n\t\t\t}\n\t\t'));c.push('\n\t\tif (typeof value !== "number" || isNaN(value) || !isFinite(value)) {\n\t\t\t'+this.makeError({type:"number",actual:"origValue",
		messages:a})+"\n\t\t\treturn value;\n\t\t}\n\t");null!=b.min&&c.push("\n\t\t\tif (value < "+b.min+") {\n\t\t\t\t"+this.makeError({type:"numberMin",expected:b.min,actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");null!=b.max&&c.push("\n\t\t\tif (value > "+b.max+") {\n\t\t\t\t"+this.makeError({type:"numberMax",expected:b.max,actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");null!=b.equal&&c.push("\n\t\t\tif (value !== "+b.equal+") {\n\t\t\t\t"+this.makeError({type:"numberEqual",expected:b.equal,actual:"origValue",
		messages:a})+"\n\t\t\t}\n\t\t");null!=b.notEqual&&c.push("\n\t\t\tif (value === "+b.notEqual+") {\n\t\t\t\t"+this.makeError({type:"numberNotEqual",expected:b.notEqual,actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.integer&&c.push("\n\t\t\tif (value % 1 !== 0) {\n\t\t\t\t"+this.makeError({type:"numberInteger",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");!0===b.positive&&c.push("\n\t\t\tif (value <= 0) {\n\t\t\t\t"+this.makeError({type:"numberPositive",actual:"origValue",messages:a})+
		"\n\t\t\t}\n\t\t");!0===b.negative&&c.push("\n\t\t\tif (value >= 0) {\n\t\t\t\t"+this.makeError({type:"numberNegative",actual:"origValue",messages:a})+"\n\t\t\t}\n\t\t");c.push("\n\t\treturn value;\n\t");return {sanitized:d,source:c.join("\n")}}function B(a,b,c){var d=a.schema;a.messages;a=[];a.push("\n\t\tvar hasValid = false;\n\t\tvar newVal = value;\n\t\tvar checkErrors = [];\n\t\tvar errorsSize = errors.length;\n\t");for(var f=0;f<d.rules.length;f++){a.push("\n\t\t\tif (!hasValid) {\n\t\t\t\tvar _errors = [];\n\t\t");
		var k=this.getRuleFromSchema(d.rules[f]);a.push(this.compileRule(k,c,b,"var tmpVal = "+(c.async?"await ":"")+"context.fn[%%INDEX%%](value, field, parent, _errors, context);","tmpVal"));a.push("\n\t\t\t\tif (errors.length == errorsSize && _errors.length == 0) {\n\t\t\t\t\thasValid = true;\n\t\t\t\t\tnewVal = tmpVal;\n\t\t\t\t} else {\n\t\t\t\t\tArray.prototype.push.apply(checkErrors, [].concat(_errors, errors.splice(errorsSize)));\n\t\t\t\t}\n\t\t\t}\n\t\t");}a.push("\n\t\tif (!hasValid) {\n\t\t\tArray.prototype.push.apply(errors, checkErrors);\n\t\t}\n\n\t\treturn newVal;\n\t");
		return {source:a.join("\n")}}function da(a){a.schema;return {source:'\n\t\t\tif (typeof value !== "function")\n\t\t\t\t'+this.makeError({type:"function",actual:"value",messages:a.messages})+"\n\n\t\t\treturn value;\n\t\t"}}function ca(a){var b=a.schema;a=a.messages;var c=[];c.push("\n\t\tif (value !== null && value !== undefined) {\n\t");b.remove?c.push("\n\t\t\treturn undefined;\n\t\t"):c.push("\n\t\t\t"+this.makeError({type:"forbidden",actual:"value",messages:a})+"\n\t\t");c.push("\n\t\t}\n\n\t\treturn value;\n\t");
		return {source:c.join("\n")}}function ba(a){var b=a.schema;a=a.messages;var c=[];b.field?(b.strict?c.push('\n\t\t\t\tif (value !== parent["'+b.field+'"])\n\t\t\t'):c.push('\n\t\t\t\tif (value != parent["'+b.field+'"])\n\t\t\t'),c.push("\n\t\t\t\t"+this.makeError({type:"equalField",actual:"value",expected:JSON.stringify(b.field),messages:a})+"\n\t\t")):(b.strict?c.push("\n\t\t\t\tif (value !== "+JSON.stringify(b.value)+")\n\t\t\t"):c.push("\n\t\t\t\tif (value != "+JSON.stringify(b.value)+")\n\t\t\t"),
		c.push("\n\t\t\t\t"+this.makeError({type:"equalValue",actual:"value",expected:JSON.stringify(b.value),messages:a})+"\n\t\t"));c.push("\n\t\treturn value;\n\t");return {source:c.join("\n")}}function aa(a){var b=a.schema;a=a.messages;return {source:"\n\t\t\tif ("+JSON.stringify(b.values||[])+".indexOf(value) === -1)\n\t\t\t\t"+this.makeError({type:"enumValue",expected:'"'+b.values.join(", ")+'"',actual:"value",messages:a})+"\n\t\t\t\n\t\t\treturn value;\n\t\t"}}function Z(a){var b=a.schema;a=a.messages;
		var c=[],d="precise"==b.mode?qa:ra,f=!1;c.push('\n\t\tif (typeof value !== "string") {\n\t\t\t'+this.makeError({type:"string",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\t");b.empty?c.push("\n\t\t\tif (value.length === 0) return value;\n\t\t"):c.push("\n\t\t\tif (value.length === 0) {\n\t\t\t\t"+this.makeError({type:"emailEmpty",actual:"value",messages:a})+"\n\t\t\t\treturn value;\n\t\t\t}\n\t\t");b.normalize&&(f=!0,c.push("\n\t\t\tvalue = value.trim().toLowerCase();\n\t\t"));null!=
		b.min&&c.push("\n\t\t\tif (value.length < "+b.min+") {\n\t\t\t\t"+this.makeError({type:"emailMin",expected:b.min,actual:"value.length",messages:a})+"\n\t\t\t}\n\t\t");null!=b.max&&c.push("\n\t\t\tif (value.length > "+b.max+") {\n\t\t\t\t"+this.makeError({type:"emailMax",expected:b.max,actual:"value.length",messages:a})+"\n\t\t\t}\n\t\t");c.push("\n\t\tif (!"+d.toString()+".test(value)) {\n\t\t\t"+this.makeError({type:"email",actual:"value",messages:a})+"\n\t\t}\n\n\t\treturn value;\n\t");return {sanitized:f,
		source:c.join("\n")}}function Y(a){var b=a.schema;a=a.messages;var c=[],d=!1;c.push("\n\t\tvar origValue = value;\n\t");!0===b.convert&&(d=!0,c.push("\n\t\t\tif (!(value instanceof Date)) {\n\t\t\t\tvalue = new Date(value.length && !isNaN(+value) ? +value : value);\n\t\t\t}\n\t\t"));c.push("\n\t\tif (!(value instanceof Date) || isNaN(value.getTime()))\n\t\t\t"+this.makeError({type:"date",actual:"origValue",messages:a})+"\n\n\t\treturn value;\n\t");return {sanitized:d,source:c.join("\n")}}function X(a){var b=
		a.schema;a=a.messages;var c=b.currencySymbol||null,d=b.thousandSeparator||",",f=b.decimalSeparator||".",k=b.customRegex;b=!b.symbolOptional;b="(?=.*\\d)^(-?~1|~1-?)(([0-9]\\d{0,2}(~2\\d{3})*)|0)?(\\~3\\d{1,2})?$".replace(/~1/g,c?"\\"+c+(b?"":"?"):"").replace("~2",d).replace("~3",f);c=[];c.push("\n\t\tif (!value.match("+(k||new RegExp(b))+")) {\n\t\t\t"+this.makeError({type:"currency",actual:"value",messages:a})+"\n\t\t\treturn value;\n\t\t}\n\n\t\treturn value;\n\t");return {source:c.join("\n")}}function W(a,
		b,c){var d=[];d.push("\n\t\t"+this.makeCustomValidator({fnName:"check",path:b,schema:a.schema,messages:a.messages,context:c,ruleIndex:a.index})+"\n\t\treturn value;\n\t");return {source:d.join("\n")}}function V(a,b,c){b=a.schema;var d=a.messages;a=a.index;var f=[],k=b.instanceOf.name?b.instanceOf.name:"<UnknowClass>";c.customs[a]?c.customs[a].schema=b:c.customs[a]={schema:b};f.push("\n\t\tif (!(value instanceof context.customs["+a+"].schema.instanceOf))\n\t\t\t"+this.makeError({type:"classInstanceOf",
		actual:"value",expected:"'"+k+"'",messages:d})+"\n\t");f.push("\n\t\treturn value;\n\t");return {source:f.join("\n")}}function U(a){var b=a.schema;a=a.messages;var c=[],d=!1;c.push("\n\t\tvar origValue = value;\n\t");!0===b.convert&&(d=!0,c.push('\n\t\t\tif (typeof value !== "boolean") {\n\t\t\t\tif (\n\t\t\t\tvalue === 1\n\t\t\t\t|| value === "true"\n\t\t\t\t|| value === "1"\n\t\t\t\t|| value === "on"\n\t\t\t\t) {\n\t\t\t\t\tvalue = true;\n\t\t\t\t} else if (\n\t\t\t\tvalue === 0\n\t\t\t\t|| value === "false"\n\t\t\t\t|| value === "0"\n\t\t\t\t|| value === "off"\n\t\t\t\t) {\n\t\t\t\t\tvalue = false;\n\t\t\t\t}\n\t\t\t}\n\t\t'));
		c.push('\n\t\tif (typeof value !== "boolean") {\n\t\t\t'+this.makeError({type:"boolean",actual:"origValue",messages:a})+"\n\t\t}\n\t\t\n\t\treturn value;\n\t");return {sanitized:d,source:c.join("\n")}}function T(a,b,c){var d=a.schema,f=a.messages;a=[];var k=!1;!0===d.convert&&(k=!0,a.push("\n\t\t\tif (!Array.isArray(value) && value != null) {\n\t\t\t\tvalue = [value];\n\t\t\t}\n\t\t"));a.push("\n\t\tif (!Array.isArray(value)) {\n\t\t\t"+this.makeError({type:"array",actual:"value",messages:f})+"\n\t\t\treturn value;\n\t\t}\n\n\t\tvar len = value.length;\n\t");
		!1===d.empty&&a.push("\n\t\t\tif (len === 0) {\n\t\t\t\t"+this.makeError({type:"arrayEmpty",actual:"value",messages:f})+"\n\t\t\t}\n\t\t");null!=d.min&&a.push("\n\t\t\tif (len < "+d.min+") {\n\t\t\t\t"+this.makeError({type:"arrayMin",expected:d.min,actual:"len",messages:f})+"\n\t\t\t}\n\t\t");null!=d.max&&a.push("\n\t\t\tif (len > "+d.max+") {\n\t\t\t\t"+this.makeError({type:"arrayMax",expected:d.max,actual:"len",messages:f})+"\n\t\t\t}\n\t\t");null!=d.length&&a.push("\n\t\t\tif (len !== "+d.length+
		") {\n\t\t\t\t"+this.makeError({type:"arrayLength",expected:d.length,actual:"len",messages:f})+"\n\t\t\t}\n\t\t");null!=d.contains&&a.push("\n\t\t\tif (value.indexOf("+JSON.stringify(d.contains)+") === -1) {\n\t\t\t\t"+this.makeError({type:"arrayContains",expected:JSON.stringify(d.contains),actual:"value",messages:f})+"\n\t\t\t}\n\t\t");!0===d.unique&&a.push("\n\t\t\tif(len > (new Set(value)).size) {\n\t\t\t\t"+this.makeError({type:"arrayUnique",expected:"Array.from(new Set(value.filter((item, index) => value.indexOf(item) !== index)))",
		actual:"value",messages:f})+"\n\t\t\t}\n\t\t");if(null!=d.enum){var u=JSON.stringify(d.enum);a.push("\n\t\t\tfor (var i = 0; i < value.length; i++) {\n\t\t\t\tif ("+u+".indexOf(value[i]) === -1) {\n\t\t\t\t\t"+this.makeError({type:"arrayEnum",expected:'"'+d.enum.join(", ")+'"',actual:"value[i]",messages:f})+"\n\t\t\t\t}\n\t\t\t}\n\t\t");}null!=d.items?(a.push("\n\t\t\tvar arr = value;\n\t\t\tvar parentField = field;\n\t\t\tfor (var i = 0; i < arr.length; i++) {\n\t\t\t\tvalue = arr[i];\n\t\t"),b+=
		"[]",d=this.getRuleFromSchema(d.items),a.push(this.compileRule(d,c,b,"arr[i] = "+(c.async?"await ":"")+'context.fn[%%INDEX%%](arr[i], (parentField ? parentField : "") + "[" + i + "]", parent, errors, context)',"arr[i]")),a.push("\n\t\t\t}\n\t\t"),a.push("\n\t\treturn arr;\n\t")):a.push("\n\t\treturn value;\n\t");return {sanitized:k,source:a.join("\n")}}function S(){var a=[];a.push("\n\t\treturn value;\n\t");return {source:a.join("\n")}}function sa(a,b,c){return a.replace(b,void 0===c||null===c?"":"function"===
		typeof c.toString?c:typeof c)}function A(a,b,c){void 0===c&&(c={});for(var d in b){var f=b[d];f="object"!==typeof f||Array.isArray(f)||null==f?!1:0<Object.keys(f).length;if(f)a[d]=a[d]||{},A(a[d],b[d],c);else if(!0!==c.skipIfExist||void 0===a[d])a[d]=b[d];}return a}function K(a){return a.replace(ta,function(b){switch(b){case '"':case "'":case "\\":return "\\"+b;case "\n":return "\\n";case "\r":return "\\r";case "\u2028":return "\\u2028";case "\u2029":return "\\u2029"}})}function N(){throw Error("Dynamic requires are not currently supported by rollup-plugin-commonjs");
		}var r={required:"The '{field}' field is required.",string:"The '{field}' field must be a string.",stringEmpty:"The '{field}' field must not be empty.",stringMin:"The '{field}' field length must be greater than or equal to {expected} characters long.",stringMax:"The '{field}' field length must be less than or equal to {expected} characters long.",stringLength:"The '{field}' field length must be {expected} characters long.",stringPattern:"The '{field}' field fails to match the required pattern.",stringContains:"The '{field}' field must contain the '{expected}' text.",
		stringEnum:"The '{field}' field does not match any of the allowed values.",stringNumeric:"The '{field}' field must be a numeric string.",stringAlpha:"The '{field}' field must be an alphabetic string.",stringAlphanum:"The '{field}' field must be an alphanumeric string.",stringAlphadash:"The '{field}' field must be an alphadash string.",stringHex:"The '{field}' field must be a hex string.",stringSingleLine:"The '{field}' field must be a single line string.",stringBase64:"The '{field}' field must be a base64 string.",
		number:"The '{field}' field must be a number.",numberMin:"The '{field}' field must be greater than or equal to {expected}.",numberMax:"The '{field}' field must be less than or equal to {expected}.",numberEqual:"The '{field}' field must be equal to {expected}.",numberNotEqual:"The '{field}' field can't be equal to {expected}.",numberInteger:"The '{field}' field must be an integer.",numberPositive:"The '{field}' field must be a positive number.",numberNegative:"The '{field}' field must be a negative number.",
		array:"The '{field}' field must be an array.",arrayEmpty:"The '{field}' field must not be an empty array.",arrayMin:"The '{field}' field must contain at least {expected} items.",arrayMax:"The '{field}' field must contain less than or equal to {expected} items.",arrayLength:"The '{field}' field must contain {expected} items.",arrayContains:"The '{field}' field must contain the '{expected}' item.",arrayUnique:"The '{actual}' value in '{field}' field does not unique the '{expected}' values.",arrayEnum:"The '{actual}' value in '{field}' field does not match any of the '{expected}' values.",
		tuple:"The '{field}' field must be an array.",tupleEmpty:"The '{field}' field must not be an empty array.",tupleLength:"The '{field}' field must contain {expected} items.",boolean:"The '{field}' field must be a boolean.",currency:"The '{field}' must be a valid currency format",date:"The '{field}' field must be a Date.",dateMin:"The '{field}' field must be greater than or equal to {expected}.",dateMax:"The '{field}' field must be less than or equal to {expected}.",enumValue:"The '{field}' field value '{expected}' does not match any of the allowed values.",
		equalValue:"The '{field}' field value must be equal to '{expected}'.",equalField:"The '{field}' field value must be equal to '{expected}' field value.",forbidden:"The '{field}' field is forbidden.",function:"The '{field}' field must be a function.",email:"The '{field}' field must be a valid e-mail.",emailEmpty:"The '{field}' field must not be empty.",emailMin:"The '{field}' field length must be greater than or equal to {expected} characters long.",emailMax:"The '{field}' field length must be less than or equal to {expected} characters long.",
		luhn:"The '{field}' field must be a valid checksum luhn.",mac:"The '{field}' field must be a valid MAC address.",object:"The '{field}' must be an Object.",objectStrict:"The object '{field}' contains forbidden keys: '{actual}'.",objectMinProps:"The object '{field}' must contain at least {expected} properties.",objectMaxProps:"The object '{field}' must contain {expected} properties at most.",url:"The '{field}' field must be a valid URL.",urlEmpty:"The '{field}' field must not be empty.",uuid:"The '{field}' field must be a valid UUID.",
		uuidVersion:"The '{field}' field must be a valid UUID version provided.",classInstanceOf:"The '{field}' field must be an instance of the '{expected}' class.",objectID:"The '{field}' field must be an valid ObjectID",record:"The '{field}' must be an Object."};r.required;r.string;r.stringEmpty;r.stringMin;r.stringMax;r.stringLength;r.stringPattern;r.stringContains;r.stringEnum;r.stringNumeric;r.stringAlpha;r.stringAlphanum;r.stringAlphadash;r.stringHex;r.stringSingleLine;r.stringBase64;r.number;r.numberMin;
		r.numberMax;r.numberEqual;r.numberNotEqual;r.numberInteger;r.numberPositive;r.numberNegative;r.array;r.arrayEmpty;r.arrayMin;r.arrayMax;r.arrayLength;r.arrayContains;r.arrayUnique;r.arrayEnum;r.tuple;r.tupleEmpty;r.tupleLength;r.currency;r.date;r.dateMin;r.dateMax;r.enumValue;r.equalValue;r.equalField;r.forbidden;r.email;r.emailEmpty;r.emailMin;r.emailMax;r.luhn;r.mac;r.object;r.objectStrict;r.objectMinProps;r.objectMaxProps;r.url;r.urlEmpty;r.uuid;r.uuidVersion;r.classInstanceOf;r.objectID;r.record;
		var qa=/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,ra=/^\S+@\S+\.\S+$/,pa=/^[_$a-zA-Z][_$a-zA-Z0-9]*$/,ta=/["'\\\n\r\u2028\u2029]/g,ia=/^-?[0-9]\d*(\.\d+)?$/,ja=/^[a-zA-Z]+$/,ka=/^[a-zA-Z0-9]+$/,la=/^[a-zA-Z0-9_-]+$/,ma=/^[0-9a-fA-F]+$/,na=/^(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+/]{3}=)?$/,ha=/^https?:\/\/\S+/,fa=/^([0-9a-f]{8}-[0-9a-f]{4}-[1-6][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}|[0]{8}-[0]{4}-[0]{4}-[0]{4}-[0]{12})$/i,
		ea=/^((([a-f0-9][a-f0-9]+[-]){5}|([a-f0-9][a-f0-9]+[:]){5})([a-f0-9][a-f0-9])$)|(^([a-f0-9][a-f0-9][a-f0-9][a-f0-9]+[.]){2}([a-f0-9][a-f0-9][a-f0-9][a-f0-9]))$/i,I,O,J,P;try{var M=(new Function("return Object.getPrototypeOf(async function(){}).constructor"))();}catch(a){}e.prototype.validate=function(a,b){return this.compile(b)(a)};e.prototype.wrapRequiredCheckSourceCode=function(a,b,c,d){var f=[],k=this.opts.considerNullAsAValue;void 0===k&&(k=!1);var u=!0===a.schema.optional||"forbidden"===a.schema.type,
		z=k?!1!==a.schema.nullable||"forbidden"===a.schema.type:!0===a.schema.optional||!0===a.schema.nullable||"forbidden"===a.schema.type;(k?void 0!=a.schema.default&&null!=a.schema.default:void 0!=a.schema.default)?(u=!1,k?!1===a.schema.nullable&&(z=!1):!0!==a.schema.nullable&&(z=!1),"function"===typeof a.schema.default?(c.customs[a.index]||(c.customs[a.index]={}),c.customs[a.index].defaultFn=a.schema.default,a="context.customs["+a.index+"].defaultFn.call(this, context.rules["+a.index+"].schema, field, parent, context)"):
		a=JSON.stringify(a.schema.default),d="\n\t\t\t\tvalue = "+a+";\n\t\t\t\t"+d+" = value;\n\t\t\t"):d=this.makeError({type:"required",actual:"value",messages:a.messages});f.push("\n\t\t\tif (value === undefined) { "+((u?"\n// allow undefined\n":d)+" }\n\t\t\telse if (value === null) { ")+((z?"\n// allow null\n":d)+" }\n\t\t\t")+(b?"else { "+b+" }":"")+"\n\t\t");return f.join("\n")};e.prototype.isMetaKey=function(a){return a.startsWith("$$")};e.prototype.removeMetasKeys=function(a){var b=this;Object.keys(a).forEach(function(c){b.isMetaKey(c)&&
		delete a[c];});};e.prototype.compile=function(a){function b(u,z){d.data=u;z&&z.meta&&(d.meta=z.meta);return k.call(c,u,d)}if(null===a||"object"!==typeof a)throw Error("Invalid schema.");var c=this,d={index:0,async:!0===a.$$async,rules:[],fn:[],customs:{},utils:{replace:sa}};this.cache.clear();delete a.$$async;if(d.async&&!M)throw Error("Asynchronous mode is not supported.");if(!0!==a.$$root)if(Array.isArray(a))a=this.getRuleFromSchema(a).schema;else {var f=Object.assign({},a);a={type:"object",strict:f.$$strict,
		properties:f};this.removeMetasKeys(f);}f=["var errors = [];","var field;","var parent = null;","var label = "+(a.label?'"'+a.label+'"':"null")+";"];a=this.getRuleFromSchema(a);f.push(this.compileRule(a,d,null,(d.async?"await ":"")+"context.fn[%%INDEX%%](value, field, null, errors, context, label);","value"));f.push("if (errors.length) {");f.push("\n\t\t\treturn errors.map(err => {\n\t\t\t\tif (err.message) {\n\t\t\t\t\terr.message = context.utils.replace(err.message, /\\{field\\}/g, err.label || err.field);\n\t\t\t\t\terr.message = context.utils.replace(err.message, /\\{expected\\}/g, err.expected);\n\t\t\t\t\terr.message = context.utils.replace(err.message, /\\{actual\\}/g, err.actual);\n\t\t\t\t}\n\t\t\t\tif(!err.label) delete err.label\n\t\t\t\treturn err;\n\t\t\t});\n\t\t");
		f.push("}");f.push("return true;");a=f.join("\n");var k=new (d.async?M:Function)("value","context",a);this.opts.debug&&console.log(this._formatter("// Main check function\n"+k.toString()));this.cache.clear();b.async=d.async;return b};e.prototype.compileRule=function(a,b,c,d,f){var k=[],u=this.cache.get(a.schema);u?(a=u,a.cycle=!0,a.cycleStack=[],k.push(this.wrapRequiredCheckSourceCode(a,"\n\t\t\t\tvar rule = context.rules["+a.index+"];\n\t\t\t\tif (rule.cycleStack.indexOf(value) === -1) {\n\t\t\t\t\trule.cycleStack.push(value);\n\t\t\t\t\t"+
		d.replace(/%%INDEX%%/g,a.index)+"\n\t\t\t\t\trule.cycleStack.pop(value);\n\t\t\t\t}\n\t\t\t",b,f))):(this.cache.set(a.schema,a),a.index=b.index,b.rules[b.index]=a,u=null!=c?c:"$$root",b.index++,c=a.ruleFunction.call(this,a,c,b),c.source=c.source.replace(/%%INDEX%%/g,a.index),c=new (b.async?M:Function)("value","field","parent","errors","context","label",c.source),b.fn[a.index]=c.bind(this),k.push(this.wrapRequiredCheckSourceCode(a,d.replace(/%%INDEX%%/g,a.index),b,f)),k.push(this.makeCustomValidator({vName:f,
		path:u,schema:a.schema,context:b,messages:a.messages,ruleIndex:a.index})),this.opts.debug&&console.log(this._formatter("// Context.fn["+a.index+"]\n"+c.toString())));return k.join("\n")};e.prototype.getRuleFromSchema=function(a){a=this.resolveType(a);var b=this.aliases[a.type];b&&(delete a.type,a=A(a,b,{skipIfExist:!0}));b=this.rules[a.type];if(!b)throw Error("Invalid '"+a.type+"' type in validator schema.");return {messages:Object.assign({},this.messages,a.messages),schema:A(a,this.defaults[a.type],
		{skipIfExist:!0}),ruleFunction:b}};e.prototype.parseShortHand=function(a){a=a.split("|").map(function(d){return d.trim()});var b=a[0];var c=b.endsWith("[]")?this.getRuleFromSchema({type:"array",items:b.slice(0,-2)}).schema:{type:a[0]};a.slice(1).map(function(d){var f=d.indexOf(":");if(-1!==f){var k=d.substr(0,f).trim();d=d.substr(f+1).trim();"true"===d||"false"===d?d="true"===d:Number.isNaN(Number(d))||(d=Number(d));c[k]=d;}else d.startsWith("no-")?c[d.slice(3)]=!1:c[d]=!0;});return c};e.prototype.makeError=
		function(a){var b=a.type,c=a.field,d=a.expected,f=a.actual,k={type:'"'+b+'"',message:'"'+a.messages[b]+'"'};k.field=c?'"'+c+'"':"field";null!=d&&(k.expected=d);null!=f&&(k.actual=f);k.label="label";return "errors.push({ "+Object.keys(k).map(function(u){return u+": "+k[u]}).join(", ")+" });"};e.prototype.makeCustomValidator=function(a){var b=a.vName;void 0===b&&(b="value");var c=a.fnName;void 0===c&&(c="custom");var d=a.ruleIndex,f=a.path,k=a.schema,u=a.context,z=a.messages;a="rule"+d;var C="fnCustomErrors"+
		d;if("function"==typeof k[c]){u.customs[d]?(u.customs[d].messages=z,u.customs[d].schema=k):u.customs[d]={messages:z,schema:k};if(this.opts.useNewCustomCheckerFunction)return "\n               \t\tconst "+a+" = context.customs["+d+"];\n\t\t\t\t\tconst "+C+" = [];\n\t\t\t\t\t"+b+" = "+(u.async?"await ":"")+a+".schema."+c+".call(this, "+b+", "+C+" , "+a+'.schema, "'+f+'", parent, context);\n\t\t\t\t\tif (Array.isArray('+C+" )) {\n                  \t\t"+C+" .forEach(err => errors.push(Object.assign({ message: "+
		a+".messages[err.type], field }, err)));\n\t\t\t\t\t}\n\t\t\t\t";k="res_"+a;return "\n\t\t\t\tconst "+a+" = context.customs["+d+"];\n\t\t\t\tconst "+k+" = "+(u.async?"await ":"")+a+".schema."+c+".call(this, "+b+", "+a+'.schema, "'+f+'", parent, context);\n\t\t\t\tif (Array.isArray('+k+")) {\n\t\t\t\t\t"+k+".forEach(err => errors.push(Object.assign({ message: "+a+".messages[err.type], field }, err)));\n\t\t\t\t}\n\t\t"}return ""};e.prototype.add=function(a,b){this.rules[a]=b;};e.prototype.addMessage=
		function(a,b){this.messages[a]=b;};e.prototype.alias=function(a,b){if(this.rules[a])throw Error("Alias name must not be a rule name");this.aliases[a]=b;};e.prototype.plugin=function(a){if("function"!==typeof a)throw Error("Plugin fn type must be function");return a(this)};e.prototype.resolveType=function(a){var b=this;if("string"===typeof a)a=this.parseShortHand(a);else if(Array.isArray(a)){if(0===a.length)throw Error("Invalid schema.");a={type:"multi",rules:a};a.rules.map(function(u){return b.getRuleFromSchema(u)}).every(function(u){return !0===
		u.schema.optional})&&(a.optional=!0);var c=this.opts.considerNullAsAValue?!1:!0;a.rules.map(function(u){return b.getRuleFromSchema(u)}).every(function(u){return u.schema.nullable===c})&&(a.nullable=c);}if(a.$$type){var d=this.getRuleFromSchema(a.$$type).schema;delete a.$$type;var f=Object.assign({},a),k;for(k in a)delete a[k];A(a,d,{skipIfExist:!0});a.props=f;}return a};e.prototype.normalize=function(a){var b=this,c=this.resolveType(a);this.aliases[c.type]&&(c=A(c,this.normalize(this.aliases[c.type]),
		{skipIfExists:!0}));c=A(c,this.defaults[c.type],{skipIfExist:!0});if("multi"===c.type)return c.rules=c.rules.map(function(d){return b.normalize(d)}),c.optional=c.rules.every(function(d){return !0===d.optional}),c;if("array"===c.type)return c.items=this.normalize(c.items),c;"object"===c.type&&c.props&&Object.entries(c.props).forEach(function(d){return c.props[d[0]]=b.normalize(d[1])});"object"===typeof a&&(a.type?(a=this.normalize(a.type),A(c,a,{skipIfExists:!0})):Object.entries(a).forEach(function(d){return c[d[0]]=
		b.normalize(d[1])}));return c};return e}module.exports=H(); 
	} (index_min));

	var index_minExports = index_min.exports;
	var Validator = /*@__PURE__*/getDefaultExportFromCjs(index_minExports);

	/**
	 * Copyright (c) 2024 Anthony Mugendi
	 *
	 * This software is released under the MIT License.
	 * https://opensource.org/licenses/MIT
	 */

	let elementSchema = {
	  type: 'string',
	  optional: true,
	  default: 'input',
	  lowercase: true,
	  enum: [
	    'input',
	    'textarea',
	    'select',
	    'div',
	    'hr',
	    'br',
	    'h1',
	    'h2',
	    'h3',
	    'h4',
	    'h5',
	    'h6',
	  ],
	};

	let inputTypeSchema = {
	  type: 'string',
	  optional: true,
	  default: 'text',
	  lowercase: true,
	  enum: [
	    'button',
	    'checkbox',
	    'color',
	    'date',
	    'datetime-local',
	    'email',
	    'file',
	    'hidden',
	    'image',
	    'month',
	    'number',
	    'password',
	    'radio',
	    'range',
	    'reset',
	    'search',
	    'submit',
	    'tel',
	    'text',
	    'time',
	    'url',
	    'week',
	  ],
	};

	const controlSchema = {
	  $$root: true,
	  //   $$strict: 'remove',

	  type: 'object',
	  props: {
	    element: elementSchema,
	    attributes: {
	      type: 'object',
	      props: {
	        name: { type: 'string' },
	        type: inputTypeSchema,
	      },
	    },
	    label: {
	      type: 'multi',
	      optional: true,
	      rules: [
	        { type: 'string' },
	        {
	          type: 'object',
	          props: {
	            text: 'string',
	            classes: {
	              type: 'array',
	              items: 'string',
	              optional: true,
	            },
	          },
	        },
	      ],
	    },
	    validation: {
	      type: 'object',
	      optional: true,
	      props: {
	        enum: {
	          type: 'array',
	          optional: true,
	        },
	        type: { type: 'string', optional: true, default: 'string' },
	        required: { type: 'boolean', optional: true },
	        name: { type: 'string', optional: true },
	        lowercase: { type: 'boolean', optional: true },
	        min: { type: 'number', optional: true },
	        max: { type: 'number', optional: true },
	        contains: { type: 'any', optional: true },
	        equal: { type: 'any', optional: true },
	        notEqual: { type: 'any', optional: true },
	        positive: { type: 'boolean', optional: true },
	        negative: { type: 'boolean', optional: true },
	        integer: { type: 'boolean', optional: true },
	        minProps: { type: 'number', optional: true, positive: true },
	        maxProps: { type: 'number', optional: true, positive: true },
	        alphanum: { type: 'boolean', optional: true },
	        alphadash: { type: 'boolean', optional: true },
	        hex: { type: 'boolean', optional: true },
	        singleLine: { type: 'boolean', optional: true },
	        base64: { type: 'boolean', optional: true },
	        lowercase: { type: 'boolean', optional: true },
	        uppercase: { type: 'boolean', optional: true },
	        localeLowercase: { type: 'boolean', optional: true },
	        localeUppercase: { type: 'boolean', optional: true },
	        padStart: { type: 'number', optional: true },
	        padEnd: { type: 'number', optional: true },
	        padStart: { type: 'number', optional: true },
	        trimLeft: { type: 'boolean', optional: true },
	        trimRight: { type: 'boolean', optional: true },
	        trim: { type: 'boolean', optional: true },
	        normalize: { type: 'boolean', optional: true },
	      },
	    },
	    options: {
	      type: 'array',
	      optional: true,
	      items: {
	        type: 'multi',
	        rules: [
	          { type: 'any' },
	          {
	            type: 'object',
	            props: {
	              text: 'string',
	              value: 'any',
	            },
	          },
	        ],
	      },
	    },
	    checked: { type: 'boolean', optional: true },
	    content: { type: 'string', optional: true },
	    classes: { type: 'array', default: ['col-sm-12'], optional: true, items: 'string' },
	  },
	};

	/**
	 * Copyright (c) 2024 Anthony Mugendi
	 * 
	 * This software is released under the MIT License.
	 * https://opensource.org/licenses/MIT
	 */

	// istanbul ignore next
	const isObject = obj => {
	  if (typeof obj === "object" && obj !== null) {
	    if (typeof Object.getPrototypeOf === "function") {
	      const prototype = Object.getPrototypeOf(obj);
	      return prototype === Object.prototype || prototype === null
	    }

	    return Object.prototype.toString.call(obj) === "[object Object]"
	  }

	  return false
	};

	const merge = (...objects) =>
	  objects.reduce((result, current) => {
	    if (Array.isArray(current)) {
	      throw new TypeError(
	        "Arguments provided to ts-deepmerge must be objects, not arrays."
	      )
	    }

	    Object.keys(current).forEach(key => {
	      if (["__proto__", "constructor", "prototype"].includes(key)) {
	        return
	      }

	      if (Array.isArray(result[key]) && Array.isArray(current[key])) {
	        result[key] = merge.options.mergeArrays
	          ? merge.options.uniqueArrayItems
	            ? Array.from(new Set(result[key].concat(current[key])))
	            : [...result[key], ...current[key]]
	          : current[key];
	      } else if (isObject(result[key]) && isObject(current[key])) {
	        result[key] = merge(result[key], current[key]);
	      } else {
	        result[key] =
	          current[key] === undefined
	            ? merge.options.allowUndefinedOverrides
	              ? current[key]
	              : result[key]
	            : current[key];
	      }
	    });

	    return result
	  }, {});

	const defaultOptions = {
	  allowUndefinedOverrides: true,
	  mergeArrays: true,
	  uniqueArrayItems: true
	};

	merge.options = defaultOptions;

	merge.withOptions = (options, ...objects) => {
	  merge.options = {
	    ...defaultOptions,
	    ...options
	  };

	  const result = merge(...objects);

	  merge.options = defaultOptions;

	  return result
	};

	/**
	 * Copyright (c) 2024 Anthony Mugendi
	 *
	 * This software is released under the MIT License.
	 * https://opensource.org/licenses/MIT
	 */

	let formInputTypes = ['input', 'select', 'textarea'];

	const magicSplit =
	  /^[a-zà-öø-ÿ]+|[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+|[a-zà-öø-ÿ]+|[0-9]+|[A-ZÀ-ÖØ-ß]+(?![a-zà-öø-ÿ])/g;

	/**
	 * Capitalises a single word
	 * @returns the word with the first character in uppercase and the rest in lowercase
	 */
	function capitaliseWord(string) {
	  const match = string.matchAll(magicSplit).next().value;
	  const firstLetterIndex = match ? match.index : 0;
	  return (
	    string.slice(0, firstLetterIndex + 1).toUpperCase() +
	    string.slice(firstLetterIndex + 1).toLowerCase()
	  );
	}

	function labelText(control) {
	  let label;
	  if (control.label) {
	    label = control.label.text || control.label;
	  } else {
	    label = capitaliseWord(control.attributes.name);
	  }

	  return label;
	}

	function clone(obj) {
	  return JSON.parse(JSON.stringify(obj));
	}

	/**
	 * Copyright (c) 2024 Anthony Mugendi
	 *
	 * This software is released under the MIT License.
	 * https://opensource.org/licenses/MIT
	 */


	const v = new Validator({
	  messages: {
	    // Register our new error message text
	    color: "The '{field}' field must be an even number! Actual: {actual}",
	    month: "The '{field}' field must be a valid month! Actual: {actual}",
	    time: "The '{field}' field must be a valid time! Actual: {actual}",
	  },
	});

	v.add('color', function ({ schema, messages }, path, context) {
	  return {
	    source: `
            function isColor(strColor) {
                const s = new Option().style;
                s.color = strColor;
                return s.color !== '';
            }
            if ( !isColor(value) ){
                ${this.makeError({ type: 'color', actual: 'value', messages })}
            }

            return value;
        `,
	  };
	});

	v.add('month', function ({ schema, messages }, path, context) {
	  return {
	    source: `        
        let months = [], d, s;

        for (let i = 0; i <= 11; i++) {
            d = new Date().setMonth(i);
            s = new Date(d).toLocaleString("en-US", { month: "short" });
            months.push(
                String(i + 1),
                new Date(d).toLocaleString("en-US", { month: "long" }).toLowerCase(),
                s.toLowerCase()
            );
        }

        function isMonth(m) {
            return months.indexOf(String(m).toLowerCase()) > -1;
        }

        if ( isMonth(value)===false ){
            ${this.makeError({ type: 'month', actual: 'value', messages })}
        }

        return value;`,
	  };
	});

	v.add('time', function ({ schema, messages }, path, context) {
	  return {
	    source: `        
        function isTime(str) {

            let numPat = /^[0-9]+$/;
            let numPatAMPM = /^([\\.apm0-9]+)$/i;
            let arr = str.split(/(:|\\s+)/).filter((s) => /^[^:\\s]+$/.test(s));
        
            if (numPat.test(arr[0]) === false || Number(arr[0]) >= 23) {
                return false;
            }
        
            if (numPat.test(arr[1]) === false || Number(arr[1]) >= 59) {
                return false;
            }

        
            if (arr[2]) {
                if (numPatAMPM.test(arr[2]) === false) {
                    return false;
                }
                if (numPat.test(arr[2]) && Number(arr[2]) >= 59) {
                    return false;
                }
            }

            if (arr[3] && numPatAMPM.test(arr[2]) === false) {
                return false;
            }
        
            return true;
        }

        if ( isTime(value)===false ){
            ${this.makeError({ type: 'time', actual: 'value', messages })}
        }

        return value;`,
	  };
	});

	const validationTypes = {
	  date: 'date',
	  'datetime-local': 'date',
	  email: 'email',
	  number: 'number',
	  url: 'url',
	  password: 'string',
	  text: 'string',
	  color: 'color',
	  month: 'month',
	  time: 'time',
	  // button: "",
	  // checkbox: "",
	  // file: "",
	  // hidden: "",
	  // image: "",
	  // radio: "",
	  // range: "",
	  // reset: "",
	  // search: "",
	  // submit: "",
	  // tel: "",
	  // week: "",
	};

	function validate(val, schema, errorPrefix = '', throwError = true) {
	  const check = v.compile(schema);
	  const isValid = check(val);

	  if (isValid !== true) {
	    let message =
	      '\n' + errorPrefix + isValid.map((o) => o.message).join('\n\t');
	    if (throwError) {
	      throw new Error(message);
	    }

	    return message;
	  } else {
	    return null;
	  }
	}

	function validateControls(controls) {
	  let inputNames = {};
	  let inputIds = {};
	  let control;

	  for (let i in controls) {
	    i = Number(i);

	    control = controls[i];

	    let schema = clone(controlSchema);
	    // radio & select boxes must have an options key
	    if (
	      control.element == 'select' ||
	      (control.element == 'input' && control.attributes.type == 'radio')
	    ) {
	      schema.props.options.optional = false;
	    }

	    // hidden fields must have a value attr
	    if (control.element == 'input' && control.attributes.type == 'hidden') {
	      schema.props.attributes.value = 'any';
	    }

	    // if not control,
	    // name name attribute optional
	    // make content a must
	    if (formInputTypes.indexOf(control.element) == -1) {
	      schema.props.attributes.optional = true;
	      schema.props.attributes.props.name.optional = true;
	      schema.props.content.optional = false;
	    }

	    // validate
	    validate(control, schema, 'Control[' + (i + 1) + '] ');

	    if (!control.attributes) {
	      continue;
	    }

	    // ensure unique names
	    if (control.attributes.name in inputNames) {
	      throw new Error(
	        'Control[' +
	          (i + 1) +
	          '] attributes.name "' +
	          control.attributes.name +
	          '" has already been used with Control[' +
	          (inputNames[control.attributes.name] + 1) +
	          ']'
	      );
	    }

	    inputNames[control.attributes.name] = i;

	    if ('id' in control.attributes && control.attributes.id in inputIds) {
	      throw new Error(
	        'Control[' +
	          (i + 1) +
	          '] attributes.id "' +
	          control.attributes.id +
	          '" has already been used with Control[' +
	          (inputIds[control.attributes.id] + 1) +
	          ']'
	      );
	    }

	    inputIds[control.attributes.id] = i;

	    // add id attribute if missing
	    if ('id' in control.attributes === false) {
	      control.attributes.id = 'control-' + control.element + '-' + (i + 1);
	    }
	  }

	  inputNames = null;
	  inputIds = null;
	  control = null;

	  return controls;
	}

	function validateValue(control) {
	  let label = labelText(control);
	  let valueSchema = {
	    type: 'string',
	    label,
	    optional: true,
	    convert: true,
	  };

	  if ('validation' in control) {
	    valueSchema = merge(valueSchema, control.validation);
	  } else {
	    // if required
	    if (control.attributes.required) {
	      valueSchema.type = validationTypes[control.attributes.type] || 'string';
	      valueSchema.optional = false;
	    }
	  }

	  let schema = {
	    value: valueSchema,
	  };

	  // validate
	  let obj = { value: control.attributes.value };
	  let error = validate(obj, schema, '', false);

	  control.attributes.value = obj.value;
	  control.error = error;

	  // console.log(JSON.stringify(schema, 0, 4));
	  // console.log(JSON.stringify(error, 0, 4));
	}

	/* src/elements/Error.svelte generated by Svelte v4.2.13 */

	function create_fragment$6(ctx) {
		let div;
		let raw_value = (/*control*/ ctx[0].error || "") + "";

		return {
			c() {
				div = element("div");
				attr(div, "class", "error");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				div.innerHTML = raw_value;
			},
			p(ctx, [dirty]) {
				if (dirty & /*control*/ 1 && raw_value !== (raw_value = (/*control*/ ctx[0].error || "") + "")) div.innerHTML = raw_value;		},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { control } = $$props;

		$$self.$$set = $$props => {
			if ('control' in $$props) $$invalidate(0, control = $$props.control);
		};

		return [control];
	}

	let Error$1 = class Error extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$6, create_fragment$6, safe_not_equal, { control: 0 });
		}
	};

	/* src/elements/Label.svelte generated by Svelte v4.2.13 */

	function create_fragment$5(ctx) {
		let label_1;
		let label_1_for_value;

		return {
			c() {
				label_1 = element("label");
				attr(label_1, "for", label_1_for_value = /*id*/ ctx[2] || /*control*/ ctx[1].attributes.id);
			},
			m(target, anchor) {
				insert(target, label_1, anchor);
				label_1.innerHTML = /*label*/ ctx[0];
			},
			p(ctx, [dirty]) {
				if (dirty & /*label*/ 1) label_1.innerHTML = /*label*/ ctx[0];
				if (dirty & /*id, control*/ 6 && label_1_for_value !== (label_1_for_value = /*id*/ ctx[2] || /*control*/ ctx[1].attributes.id)) {
					attr(label_1, "for", label_1_for_value);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(label_1);
				}
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { control } = $$props;
		let { label } = $$props;
		let { id } = $$props;

		$$self.$$set = $$props => {
			if ('control' in $$props) $$invalidate(1, control = $$props.control);
			if ('label' in $$props) $$invalidate(0, label = $$props.label);
			if ('id' in $$props) $$invalidate(2, id = $$props.id);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*label, control*/ 3) {
				if (!label) {
					$$invalidate(0, label = labelText(control));
				}
			}
		};

		return [label, control, id];
	}

	class Label extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { control: 1, label: 0, id: 2 });
		}
	}

	/* src/elements/controls/Input.svelte generated by Svelte v4.2.13 */

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[9] = list[i];
		child_ctx[11] = i;
		return child_ctx;
	}

	// (62:0) {:else}
	function create_else_block$1(ctx) {
		let div;
		let label;
		let updating_control;
		let t0;
		let error;
		let updating_control_1;
		let t1;
		let input;
		let current;
		let mounted;
		let dispose;

		function label_control_binding_2(value) {
			/*label_control_binding_2*/ ctx[7](value);
		}

		let label_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			label_props.control = /*control*/ ctx[0];
		}

		label = new Label({ props: label_props });
		binding_callbacks.push(() => bind(label, 'control', label_control_binding_2));

		function error_control_binding_2(value) {
			/*error_control_binding_2*/ ctx[8](value);
		}

		let error_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			error_props.control = /*control*/ ctx[0];
		}

		error = new Error$1({ props: error_props });
		binding_callbacks.push(() => bind(error, 'control', error_control_binding_2));
		let input_levels = [/*control*/ ctx[0].attributes];
		let input_data = {};

		for (let i = 0; i < input_levels.length; i += 1) {
			input_data = assign(input_data, input_levels[i]);
		}

		return {
			c() {
				div = element("div");
				create_component(label.$$.fragment);
				t0 = space();
				create_component(error.$$.fragment);
				t1 = space();
				input = element("input");
				attr(div, "class", "label-container");
				set_attributes(input, input_data);
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(label, div, null);
				append(div, t0);
				mount_component(error, div, null);
				insert(target, t1, anchor);
				insert(target, input, anchor);
				if (input.autofocus) input.focus();
				current = true;

				if (!mounted) {
					dispose = [
						listen(input, "change", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						}),
						listen(input, "keyup", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						})
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const label_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					label_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				label.$set(label_changes);
				const error_changes = {};

				if (!updating_control_1 && dirty & /*control*/ 1) {
					updating_control_1 = true;
					error_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control_1 = false);
				}

				error.$set(error_changes);
				set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*control*/ 1 && /*control*/ ctx[0].attributes]));
			},
			i(local) {
				if (current) return;
				transition_in(label.$$.fragment, local);
				transition_in(error.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(label.$$.fragment, local);
				transition_out(error.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
					detach(t1);
					detach(input);
				}

				destroy_component(label);
				destroy_component(error);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (60:27) 
	function create_if_block_2$1(ctx) {
		let input;
		let mounted;
		let dispose;
		let input_levels = [/*control*/ ctx[0].attributes];
		let input_data = {};

		for (let i = 0; i < input_levels.length; i += 1) {
			input_data = assign(input_data, input_levels[i]);
		}

		return {
			c() {
				input = element("input");
				set_attributes(input, input_data);
			},
			m(target, anchor) {
				insert(target, input, anchor);
				if (input.autofocus) input.focus();

				if (!mounted) {
					dispose = [
						listen(input, "change", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						}),
						listen(input, "keyup", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						})
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*control*/ 1 && /*control*/ ctx[0].attributes]));
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(input);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (50:29) 
	function create_if_block_1$1(ctx) {
		let div1;
		let div0;
		let input;
		let t0;
		let label;
		let updating_control;
		let t1;
		let error;
		let updating_control_1;
		let current;
		let mounted;
		let dispose;
		let input_levels = [/*control*/ ctx[0].attributes];
		let input_data = {};

		for (let i = 0; i < input_levels.length; i += 1) {
			input_data = assign(input_data, input_levels[i]);
		}

		function label_control_binding_1(value) {
			/*label_control_binding_1*/ ctx[5](value);
		}

		let label_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			label_props.control = /*control*/ ctx[0];
		}

		label = new Label({ props: label_props });
		binding_callbacks.push(() => bind(label, 'control', label_control_binding_1));

		function error_control_binding_1(value) {
			/*error_control_binding_1*/ ctx[6](value);
		}

		let error_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			error_props.control = /*control*/ ctx[0];
		}

		error = new Error$1({ props: error_props });
		binding_callbacks.push(() => bind(error, 'control', error_control_binding_1));

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				input = element("input");
				t0 = space();
				create_component(label.$$.fragment);
				t1 = space();
				create_component(error.$$.fragment);
				set_attributes(input, input_data);
				attr(div1, "class", "label-container");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, input);
				if (input.autofocus) input.focus();
				append(div0, t0);
				mount_component(label, div0, null);
				append(div1, t1);
				mount_component(error, div1, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(input, "change", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						}),
						listen(input, "keyup", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						})
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*control*/ 1 && /*control*/ ctx[0].attributes]));
				const label_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					label_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				label.$set(label_changes);
				const error_changes = {};

				if (!updating_control_1 && dirty & /*control*/ 1) {
					updating_control_1 = true;
					error_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control_1 = false);
				}

				error.$set(error_changes);
			},
			i(local) {
				if (current) return;
				transition_in(label.$$.fragment, local);
				transition_in(error.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(label.$$.fragment, local);
				transition_out(error.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_component(label);
				destroy_component(error);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (25:0) {#if type == "radio"}
	function create_if_block$3(ctx) {
		let div1;
		let div0;
		let t;
		let error;
		let updating_control;
		let current;
		let each_value = ensure_array_like(/*control*/ ctx[0].options);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		function error_control_binding(value) {
			/*error_control_binding*/ ctx[4](value);
		}

		let error_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			error_props.control = /*control*/ ctx[0];
		}

		error = new Error$1({ props: error_props });
		binding_callbacks.push(() => bind(error, 'control', error_control_binding));

		return {
			c() {
				div1 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t = space();
				create_component(error.$$.fragment);
				attr(div1, "class", "label-container");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append(div1, t);
				mount_component(error, div1, null);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty & /*control, onChange*/ 3) {
					each_value = ensure_array_like(/*control*/ ctx[0].options);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div0, null);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}

				const error_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					error_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				error.$set(error_changes);
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				transition_in(error.$$.fragment, local);
				current = true;
			},
			o(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				transition_out(error.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
				destroy_component(error);
			}
		};
	}

	// (28:6) {#each control.options as option, i}
	function create_each_block$2(ctx) {
		let input;
		let input_id_value;
		let input_value_value;
		let t;
		let label;
		let updating_control;
		let current;
		let mounted;
		let dispose;

		let input_levels = [
			/*control*/ ctx[0].attributes,
			{
				id: input_id_value = /*control*/ ctx[0].attributes.id + "-" + (/*i*/ ctx[11] + 1)
			},
			{
				value: input_value_value = /*option*/ ctx[9].value || /*option*/ ctx[9]
			}
		];

		let input_data = {};

		for (let i = 0; i < input_levels.length; i += 1) {
			input_data = assign(input_data, input_levels[i]);
		}

		function label_control_binding(value) {
			/*label_control_binding*/ ctx[3](value);
		}

		let label_props = {
			label: /*option*/ ctx[9].text || /*option*/ ctx[9],
			id: /*control*/ ctx[0].attributes.id + "-" + (/*i*/ ctx[11] + 1)
		};

		if (/*control*/ ctx[0] !== void 0) {
			label_props.control = /*control*/ ctx[0];
		}

		label = new Label({ props: label_props });
		binding_callbacks.push(() => bind(label, 'control', label_control_binding));

		return {
			c() {
				input = element("input");
				t = space();
				create_component(label.$$.fragment);
				set_attributes(input, input_data);
			},
			m(target, anchor) {
				insert(target, input, anchor);

				if ('value' in input_data) {
					input.value = input_data.value;
				}

				if (input.autofocus) input.focus();
				insert(target, t, anchor);
				mount_component(label, target, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen(input, "change", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						}),
						listen(input, "keyup", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						})
					];

					mounted = true;
				}
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;

				set_attributes(input, input_data = get_spread_update(input_levels, [
					dirty & /*control*/ 1 && /*control*/ ctx[0].attributes,
					(!current || dirty & /*control*/ 1 && input_id_value !== (input_id_value = /*control*/ ctx[0].attributes.id + "-" + (/*i*/ ctx[11] + 1))) && { id: input_id_value },
					(!current || dirty & /*control*/ 1 && input_value_value !== (input_value_value = /*option*/ ctx[9].value || /*option*/ ctx[9]) && input.value !== input_value_value) && { value: input_value_value }
				]));

				if ('value' in input_data) {
					input.value = input_data.value;
				}

				const label_changes = {};
				if (dirty & /*control*/ 1) label_changes.label = /*option*/ ctx[9].text || /*option*/ ctx[9];
				if (dirty & /*control*/ 1) label_changes.id = /*control*/ ctx[0].attributes.id + "-" + (/*i*/ ctx[11] + 1);

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					label_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				label.$set(label_changes);
			},
			i(local) {
				if (current) return;
				transition_in(label.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(label.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(input);
					detach(t);
				}

				destroy_component(label, detaching);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function create_fragment$4(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block$3, create_if_block_1$1, create_if_block_2$1, create_else_block$1];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*type*/ ctx[2] == "radio") return 0;
			if (/*type*/ ctx[2] == "checkbox") return 1;
			if (/*type*/ ctx[2] == "hidden") return 2;
			return 3;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { control } = $$props;
		let { onChange } = $$props;
		let type;

		function label_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		function error_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		function label_control_binding_1(value) {
			control = value;
			$$invalidate(0, control);
		}

		function error_control_binding_1(value) {
			control = value;
			$$invalidate(0, control);
		}

		function label_control_binding_2(value) {
			control = value;
			$$invalidate(0, control);
		}

		function error_control_binding_2(value) {
			control = value;
			$$invalidate(0, control);
		}

		$$self.$$set = $$props => {
			if ('control' in $$props) $$invalidate(0, control = $$props.control);
			if ('onChange' in $$props) $$invalidate(1, onChange = $$props.onChange);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*control*/ 1) {
				{
					$$invalidate(2, type = control.attributes.type);
				}
			}
		};

		return [
			control,
			onChange,
			type,
			label_control_binding,
			error_control_binding,
			label_control_binding_1,
			error_control_binding_1,
			label_control_binding_2,
			error_control_binding_2
		];
	}

	class Input extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$4, safe_not_equal, { control: 0, onChange: 1 });
		}
	}

	/* src/elements/controls/Select.svelte generated by Svelte v4.2.13 */

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	// (29:2) {#if control.attributes.placeholder}
	function create_if_block$2(ctx) {
		let option_1;
		let t_value = /*control*/ ctx[0].attributes.placeholder + "";
		let t;

		return {
			c() {
				option_1 = element("option");
				t = text(t_value);
				option_1.__value = null;
				set_input_value(option_1, option_1.__value);
				option_1.selected = true;
				option_1.disabled = true;
			},
			m(target, anchor) {
				insert(target, option_1, anchor);
				append(option_1, t);
			},
			p(ctx, dirty) {
				if (dirty & /*control*/ 1 && t_value !== (t_value = /*control*/ ctx[0].attributes.placeholder + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(option_1);
				}
			}
		};
	}

	// (32:2) {#each control.options as option}
	function create_each_block$1(ctx) {
		let option_1;
		let t_value = (/*option*/ ctx[4].text || /*option*/ ctx[4]) + "";
		let t;
		let option_1_value_value;

		return {
			c() {
				option_1 = element("option");
				t = text(t_value);
				option_1.__value = option_1_value_value = /*option*/ ctx[4].value || /*option*/ ctx[4];
				set_input_value(option_1, option_1.__value);
			},
			m(target, anchor) {
				insert(target, option_1, anchor);
				append(option_1, t);
			},
			p(ctx, dirty) {
				if (dirty & /*control*/ 1 && t_value !== (t_value = (/*option*/ ctx[4].text || /*option*/ ctx[4]) + "")) set_data(t, t_value);

				if (dirty & /*control*/ 1 && option_1_value_value !== (option_1_value_value = /*option*/ ctx[4].value || /*option*/ ctx[4])) {
					option_1.__value = option_1_value_value;
					set_input_value(option_1, option_1.__value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(option_1);
				}
			}
		};
	}

	function create_fragment$3(ctx) {
		let div;
		let label;
		let updating_control;
		let t0;
		let error;
		let updating_control_1;
		let t1;
		let select;
		let if_block_anchor;
		let select_placeholder_value;
		let current;
		let mounted;
		let dispose;

		function label_control_binding(value) {
			/*label_control_binding*/ ctx[2](value);
		}

		let label_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			label_props.control = /*control*/ ctx[0];
		}

		label = new Label({ props: label_props });
		binding_callbacks.push(() => bind(label, 'control', label_control_binding));

		function error_control_binding(value) {
			/*error_control_binding*/ ctx[3](value);
		}

		let error_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			error_props.control = /*control*/ ctx[0];
		}

		error = new Error$1({ props: error_props });
		binding_callbacks.push(() => bind(error, 'control', error_control_binding));
		let if_block = /*control*/ ctx[0].attributes.placeholder && create_if_block$2(ctx);
		let each_value = ensure_array_like(/*control*/ ctx[0].options);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		let select_levels = [
			/*control*/ ctx[0].attributes,
			{
				placeholder: select_placeholder_value = /*control*/ ctx[0].attributes.value
				? null
				: /*control*/ ctx[0].attributes.placeholder
			}
		];

		let select_data = {};

		for (let i = 0; i < select_levels.length; i += 1) {
			select_data = assign(select_data, select_levels[i]);
		}

		return {
			c() {
				div = element("div");
				create_component(label.$$.fragment);
				t0 = space();
				create_component(error.$$.fragment);
				t1 = space();
				select = element("select");
				if (if_block) if_block.c();
				if_block_anchor = empty();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "label-container");
				set_attributes(select, select_data);
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(label, div, null);
				append(div, t0);
				mount_component(error, div, null);
				insert(target, t1, anchor);
				insert(target, select, anchor);
				if (if_block) if_block.m(select, null);
				append(select, if_block_anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				'value' in select_data && (select_data.multiple ? select_options : select_option)(select, select_data.value);
				if (select.autofocus) select.focus();
				current = true;

				if (!mounted) {
					dispose = listen(select, "change", function () {
						if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
					});

					mounted = true;
				}
			},
			p(new_ctx, [dirty]) {
				ctx = new_ctx;
				const label_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					label_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				label.$set(label_changes);
				const error_changes = {};

				if (!updating_control_1 && dirty & /*control*/ 1) {
					updating_control_1 = true;
					error_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control_1 = false);
				}

				error.$set(error_changes);

				if (/*control*/ ctx[0].attributes.placeholder) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.m(select, if_block_anchor);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*control*/ 1) {
					each_value = ensure_array_like(/*control*/ ctx[0].options);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				set_attributes(select, select_data = get_spread_update(select_levels, [
					dirty & /*control*/ 1 && /*control*/ ctx[0].attributes,
					(!current || dirty & /*control*/ 1 && select_placeholder_value !== (select_placeholder_value = /*control*/ ctx[0].attributes.value
					? null
					: /*control*/ ctx[0].attributes.placeholder)) && { placeholder: select_placeholder_value }
				]));

				if (dirty & /*control*/ 1 && 'value' in select_data) (select_data.multiple ? select_options : select_option)(select, select_data.value);
			},
			i(local) {
				if (current) return;
				transition_in(label.$$.fragment, local);
				transition_in(error.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(label.$$.fragment, local);
				transition_out(error.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
					detach(t1);
					detach(select);
				}

				destroy_component(label);
				destroy_component(error);
				if (if_block) if_block.d();
				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { control } = $$props;
		let { onChange } = $$props;

		function label_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		function error_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		$$self.$$set = $$props => {
			if ('control' in $$props) $$invalidate(0, control = $$props.control);
			if ('onChange' in $$props) $$invalidate(1, onChange = $$props.onChange);
		};

		return [control, onChange, label_control_binding, error_control_binding];
	}

	class Select extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, { control: 0, onChange: 1 });
		}
	}

	/* src/elements/controls/Textarea.svelte generated by Svelte v4.2.13 */

	function create_fragment$2(ctx) {
		let div;
		let label;
		let updating_control;
		let t0;
		let error;
		let updating_control_1;
		let t1;
		let textarea;
		let current;
		let mounted;
		let dispose;

		function label_control_binding(value) {
			/*label_control_binding*/ ctx[2](value);
		}

		let label_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			label_props.control = /*control*/ ctx[0];
		}

		label = new Label({ props: label_props });
		binding_callbacks.push(() => bind(label, 'control', label_control_binding));

		function error_control_binding(value) {
			/*error_control_binding*/ ctx[3](value);
		}

		let error_props = {};

		if (/*control*/ ctx[0] !== void 0) {
			error_props.control = /*control*/ ctx[0];
		}

		error = new Error$1({ props: error_props });
		binding_callbacks.push(() => bind(error, 'control', error_control_binding));
		let textarea_levels = [/*control*/ ctx[0].attributes];
		let textarea_data = {};

		for (let i = 0; i < textarea_levels.length; i += 1) {
			textarea_data = assign(textarea_data, textarea_levels[i]);
		}

		return {
			c() {
				div = element("div");
				create_component(label.$$.fragment);
				t0 = space();
				create_component(error.$$.fragment);
				t1 = space();
				textarea = element("textarea");
				attr(div, "class", "label-container");
				set_attributes(textarea, textarea_data);
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(label, div, null);
				append(div, t0);
				mount_component(error, div, null);
				insert(target, t1, anchor);
				insert(target, textarea, anchor);
				if (textarea.autofocus) textarea.focus();
				current = true;

				if (!mounted) {
					dispose = [
						listen(textarea, "change", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						}),
						listen(textarea, "keyup", function () {
							if (is_function(/*onChange*/ ctx[1])) /*onChange*/ ctx[1].apply(this, arguments);
						})
					];

					mounted = true;
				}
			},
			p(new_ctx, [dirty]) {
				ctx = new_ctx;
				const label_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					label_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				label.$set(label_changes);
				const error_changes = {};

				if (!updating_control_1 && dirty & /*control*/ 1) {
					updating_control_1 = true;
					error_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control_1 = false);
				}

				error.$set(error_changes);
				set_attributes(textarea, textarea_data = get_spread_update(textarea_levels, [dirty & /*control*/ 1 && /*control*/ ctx[0].attributes]));
			},
			i(local) {
				if (current) return;
				transition_in(label.$$.fragment, local);
				transition_in(error.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(label.$$.fragment, local);
				transition_out(error.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
					detach(t1);
					detach(textarea);
				}

				destroy_component(label);
				destroy_component(error);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { control } = $$props;
		let { onChange } = $$props;

		function label_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		function error_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		$$self.$$set = $$props => {
			if ('control' in $$props) $$invalidate(0, control = $$props.control);
			if ('onChange' in $$props) $$invalidate(1, onChange = $$props.onChange);
		};

		return [control, onChange, label_control_binding, error_control_binding];
	}

	class Textarea extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { control: 0, onChange: 1 });
		}
	}

	/* src/elements/Control.svelte generated by Svelte v4.2.13 */

	function create_else_block(ctx) {
		let previous_tag = /*control*/ ctx[0].element;
		let svelte_element_anchor;
		let svelte_element = /*control*/ ctx[0].element && create_dynamic_element(ctx);

		return {
			c() {
				if (svelte_element) svelte_element.c();
				svelte_element_anchor = empty();
			},
			m(target, anchor) {
				if (svelte_element) svelte_element.m(target, anchor);
				insert(target, svelte_element_anchor, anchor);
			},
			p(ctx, dirty) {
				if (/*control*/ ctx[0].element) {
					if (!previous_tag) {
						svelte_element = create_dynamic_element(ctx);
						previous_tag = /*control*/ ctx[0].element;
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else if (safe_not_equal(previous_tag, /*control*/ ctx[0].element)) {
						svelte_element.d(1);
						svelte_element = create_dynamic_element(ctx);
						previous_tag = /*control*/ ctx[0].element;
						svelte_element.c();
						svelte_element.m(svelte_element_anchor.parentNode, svelte_element_anchor);
					} else {
						svelte_element.p(ctx, dirty);
					}
				} else if (previous_tag) {
					svelte_element.d(1);
					svelte_element = null;
					previous_tag = /*control*/ ctx[0].element;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(svelte_element_anchor);
				}

				if (svelte_element) svelte_element.d(detaching);
			}
		};
	}

	// (59:44) 
	function create_if_block_2(ctx) {
		let textarea;
		let updating_control;
		let current;

		function textarea_control_binding(value) {
			/*textarea_control_binding*/ ctx[6](value);
		}

		let textarea_props = { onChange: /*onChange*/ ctx[2] };

		if (/*control*/ ctx[0] !== void 0) {
			textarea_props.control = /*control*/ ctx[0];
		}

		textarea = new Textarea({ props: textarea_props });
		binding_callbacks.push(() => bind(textarea, 'control', textarea_control_binding));

		return {
			c() {
				create_component(textarea.$$.fragment);
			},
			m(target, anchor) {
				mount_component(textarea, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const textarea_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					textarea_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				textarea.$set(textarea_changes);
			},
			i(local) {
				if (current) return;
				transition_in(textarea.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(textarea.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(textarea, detaching);
			}
		};
	}

	// (57:42) 
	function create_if_block_1(ctx) {
		let select;
		let updating_control;
		let current;

		function select_control_binding(value) {
			/*select_control_binding*/ ctx[5](value);
		}

		let select_props = { onChange: /*onChange*/ ctx[2] };

		if (/*control*/ ctx[0] !== void 0) {
			select_props.control = /*control*/ ctx[0];
		}

		select = new Select({ props: select_props });
		binding_callbacks.push(() => bind(select, 'control', select_control_binding));

		return {
			c() {
				create_component(select.$$.fragment);
			},
			m(target, anchor) {
				mount_component(select, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const select_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					select_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				select.$set(select_changes);
			},
			i(local) {
				if (current) return;
				transition_in(select.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(select.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(select, detaching);
			}
		};
	}

	// (55:4) {#if control.element == "input"}
	function create_if_block$1(ctx) {
		let input;
		let updating_control;
		let current;

		function input_control_binding(value) {
			/*input_control_binding*/ ctx[4](value);
		}

		let input_props = { onChange: /*onChange*/ ctx[2] };

		if (/*control*/ ctx[0] !== void 0) {
			input_props.control = /*control*/ ctx[0];
		}

		input = new Input({ props: input_props });
		binding_callbacks.push(() => bind(input, 'control', input_control_binding));

		return {
			c() {
				create_component(input.$$.fragment);
			},
			m(target, anchor) {
				mount_component(input, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const input_changes = {};

				if (!updating_control && dirty & /*control*/ 1) {
					updating_control = true;
					input_changes.control = /*control*/ ctx[0];
					add_flush_callback(() => updating_control = false);
				}

				input.$set(input_changes);
			},
			i(local) {
				if (current) return;
				transition_in(input.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(input.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(input, detaching);
			}
		};
	}

	// (62:6) <svelte:element this={control.element}>
	function create_dynamic_element(ctx) {
		let svelte_element;
		let raw_value = /*control*/ ctx[0].content + "";

		return {
			c() {
				svelte_element = element(/*control*/ ctx[0].element);
			},
			m(target, anchor) {
				insert(target, svelte_element, anchor);
				svelte_element.innerHTML = raw_value;
			},
			p(ctx, dirty) {
				if (dirty & /*control*/ 1 && raw_value !== (raw_value = /*control*/ ctx[0].content + "")) svelte_element.innerHTML = raw_value;		},
			d(detaching) {
				if (detaching) {
					detach(svelte_element);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		let div1;
		let div0;
		let current_block_type_index;
		let if_block;
		let div0_class_value;
		let div1_class_value;
		let current;
		const if_block_creators = [create_if_block$1, create_if_block_1, create_if_block_2, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*control*/ ctx[0].element == "input") return 0;
			if (/*control*/ ctx[0].element == "select") return 1;
			if (/*control*/ ctx[0].element == "textarea") return 2;
			return 3;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				if_block.c();
				attr(div0, "class", div0_class_value = "control-group" + (/*control*/ ctx[0].error ? ' has-error' : '') + " " + (/*type*/ ctx[1] || ' content') + "");
				attr(div1, "class", div1_class_value = /*control*/ ctx[0].classes.join(" "));
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if_blocks[current_block_type_index].m(div0, null);
				current = true;
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div0, null);
				}

				if (!current || dirty & /*control, type*/ 3 && div0_class_value !== (div0_class_value = "control-group" + (/*control*/ ctx[0].error ? ' has-error' : '') + " " + (/*type*/ ctx[1] || ' content') + "")) {
					attr(div0, "class", div0_class_value);
				}

				if (!current || dirty & /*control*/ 1 && div1_class_value !== (div1_class_value = /*control*/ ctx[0].classes.join(" "))) {
					attr(div1, "class", div1_class_value);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { control } = $$props;
		let { idx } = $$props;
		let type;

		function onChange(e, val) {
			let value;

			if (e) {
				let el = e.target;

				if (el.type == "checkbox") {
					value = el.checked;
				} else {
					value = el.value;
				}
			} else {
				value = val;
			}

			$$invalidate(0, control.attributes.value = value, control);
			validateValue(control);
		}

		// run onChange if there is a value passed on creation
		onMount(function () {
			if (control.attributes && ("value" in control.attributes || control.attributes.required)) {
				onChange(null, control.attributes.value);
			}
		});

		function input_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		function select_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		function textarea_control_binding(value) {
			control = value;
			$$invalidate(0, control);
		}

		$$self.$$set = $$props => {
			if ('control' in $$props) $$invalidate(0, control = $$props.control);
			if ('idx' in $$props) $$invalidate(3, idx = $$props.idx);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*control*/ 1) {
				{
					if (formInputTypes.indexOf(control.element) > -1) {
						$$invalidate(1, type = control.attributes.type || control.element);
					}
				}
			}
		};

		return [
			control,
			type,
			onChange,
			idx,
			input_control_binding,
			select_control_binding,
			textarea_control_binding
		];
	}

	class Control extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { control: 0, idx: 3 });
		}
	}

	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	/**
	 * Copyright (c) 2024 Anthony Mugendi
	 *
	 * This software is released under the MIT License.
	 * https://opensource.org/licenses/MIT
	 */


	const Errors = writable({});
	const Values = writable({});

	/* src/Main.svelte generated by Svelte v4.2.13 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[10] = list[i];
		child_ctx[11] = list;
		child_ctx[12] = i;
		return child_ctx;
	}

	// (67:0) {#if isReady}
	function create_if_block(ctx) {
		let div1;
		let form;
		let div0;
		let t0;
		let button;
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*controls*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		return {
			c() {
				div1 = element("div");
				form = element("form");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t0 = space();
				button = element("button");
				button.textContent = "Submit";
				attr(button, "class", "button");
				attr(div0, "class", "row");
				attr(form, "class", "container-fluid");
				attr(form, "action", /*action*/ ctx[2]);
				attr(form, "method", /*method*/ ctx[1]);
				attr(div1, "class", "former");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, form);
				append(form, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append(div0, t0);
				append(div0, button);
				current = true;

				if (!mounted) {
					dispose = listen(form, "submit", /*submitForm*/ ctx[4]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*controls*/ 1) {
					each_value = ensure_array_like(/*controls*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div0, t0);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}

				if (!current || dirty & /*action*/ 4) {
					attr(form, "action", /*action*/ ctx[2]);
				}

				if (!current || dirty & /*method*/ 2) {
					attr(form, "method", /*method*/ ctx[1]);
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				dispose();
			}
		};
	}

	// (71:8) {#each controls as control, i}
	function create_each_block(ctx) {
		let control_1;
		let updating_control;
		let current;

		function control_1_control_binding(value) {
			/*control_1_control_binding*/ ctx[8](value, /*control*/ ctx[10], /*each_value*/ ctx[11], /*i*/ ctx[12]);
		}

		let control_1_props = { idx: /*i*/ ctx[12] + 1 };

		if (/*control*/ ctx[10] !== void 0) {
			control_1_props.control = /*control*/ ctx[10];
		}

		control_1 = new Control({ props: control_1_props });
		binding_callbacks.push(() => bind(control_1, 'control', control_1_control_binding));

		return {
			c() {
				create_component(control_1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(control_1, target, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const control_1_changes = {};

				if (!updating_control && dirty & /*controls*/ 1) {
					updating_control = true;
					control_1_changes.control = /*control*/ ctx[10];
					add_flush_callback(() => updating_control = false);
				}

				control_1.$set(control_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(control_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(control_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(control_1, detaching);
			}
		};
	}

	function create_fragment(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*isReady*/ ctx[3] && create_if_block(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				if (/*isReady*/ ctx[3]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*isReady*/ 8) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let $Errors;
		let $Values;
		component_subscribe($$self, Errors, $$value => $$invalidate(6, $Errors = $$value));
		component_subscribe($$self, Values, $$value => $$invalidate(7, $Values = $$value));
		let { controls = [] } = $$props;
		let { method = "POST" } = $$props;
		let { action = "" } = $$props;
		let { failOnError = true } = $$props;
		let isReady = false;

		function submitForm(e) {
			if (failOnError && hasErrors()) {
				e.preventDefault();
			}
		}

		function hasErrors() {
			return Object.keys($Errors).length > 0;
		}

		onMount(function () {
			validateControls(controls);
			$$invalidate(3, isReady = true);
		});

		function control_1_control_binding(value, control, each_value, i) {
			each_value[i] = value;
			$$invalidate(0, controls);
		}

		$$self.$$set = $$props => {
			if ('controls' in $$props) $$invalidate(0, controls = $$props.controls);
			if ('method' in $$props) $$invalidate(1, method = $$props.method);
			if ('action' in $$props) $$invalidate(2, action = $$props.action);
			if ('failOnError' in $$props) $$invalidate(5, failOnError = $$props.failOnError);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*controls*/ 1) {
				{
					let errors = {};
					let values = {};

					for (let i in controls) {
						if ("error" in controls[i] && controls[i].error) {
							errors[controls[i].attributes.name] = controls[i].error;
						}

						if (controls[i].attributes && "value" in controls[i].attributes) {
							// use booleans for checkboxes
							if (controls[i].attributes.type == "checkbox") {
								$$invalidate(0, controls[i].attributes.value = controls[i].attributes.value == "true" ? true : false, controls);
							}

							values[controls[i].attributes.name] = controls[i].attributes.value;
						}
					}

					Errors.update(o => errors);
					Values.update(o => values);
				} // console.log(JSON.stringify(errors, 0, 4));
			}

			if ($$self.$$.dirty & /*$Errors, $Values*/ 192) {
				{
					console.log($Errors);
					console.log($Values);
				}
			}
		};

		return [
			controls,
			method,
			action,
			isReady,
			submitForm,
			failOnError,
			$Errors,
			$Values,
			control_1_control_binding
		];
	}

	class Main extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance, create_fragment, safe_not_equal, {
				controls: 0,
				method: 1,
				action: 2,
				failOnError: 5
			});
		}
	}

	return Main;

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ZlbHRlLWZvcm1lci5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvcnVudGltZS9pbnRlcm5hbC91dGlscy5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3J1bnRpbWUvaW50ZXJuYWwvZG9tLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvcnVudGltZS9pbnRlcm5hbC9saWZlY3ljbGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL3NjaGVkdWxlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3J1bnRpbWUvaW50ZXJuYWwvdHJhbnNpdGlvbnMuanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL2VhY2guanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL3NwcmVhZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3J1bnRpbWUvaW50ZXJuYWwvQ29tcG9uZW50LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvc2hhcmVkL3ZlcnNpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL2Rpc2Nsb3NlLXZlcnNpb24vaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvcm9sbHVwLXBsdWdpbi1zdHlsZXMvZGlzdC9ydW50aW1lL2luamVjdC1jc3MuanMiLCIuLi9ub2RlX21vZHVsZXMvZmFzdGVzdC12YWxpZGF0b3IvZGlzdC9pbmRleC5taW4uanMiLCIuLi9zcmMvbGliL3NjaGVtYS5qcyIsIi4uL3NyYy9saWIvbWVyZ2UuanMiLCIuLi9zcmMvbGliL3V0aWxzLmpzIiwiLi4vc3JjL2xpYi92YWxpZGF0aW9uLmpzIiwiLi4vc3JjL2VsZW1lbnRzL0Vycm9yLnN2ZWx0ZSIsIi4uL3NyYy9lbGVtZW50cy9MYWJlbC5zdmVsdGUiLCIuLi9zcmMvZWxlbWVudHMvY29udHJvbHMvSW5wdXQuc3ZlbHRlIiwiLi4vc3JjL2VsZW1lbnRzL2NvbnRyb2xzL1NlbGVjdC5zdmVsdGUiLCIuLi9zcmMvZWxlbWVudHMvY29udHJvbHMvVGV4dGFyZWEuc3ZlbHRlIiwiLi4vc3JjL2VsZW1lbnRzL0NvbnRyb2wuc3ZlbHRlIiwiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvcnVudGltZS9zdG9yZS9pbmRleC5qcyIsIi4uL3NyYy9saWIvc3RvcmUuanMiLCIuLi9zcmMvTWFpbi5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgY29uc3QgaWRlbnRpdHkgPSAoeCkgPT4geDtcblxuLyoqXG4gKiBAdGVtcGxhdGUgVFxuICogQHRlbXBsYXRlIFNcbiAqIEBwYXJhbSB7VH0gdGFyXG4gKiBAcGFyYW0ge1N9IHNyY1xuICogQHJldHVybnMge1QgJiBTfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduKHRhciwgc3JjKSB7XG5cdC8vIEB0cy1pZ25vcmVcblx0Zm9yIChjb25zdCBrIGluIHNyYykgdGFyW2tdID0gc3JjW2tdO1xuXHRyZXR1cm4gLyoqIEB0eXBlIHtUICYgU30gKi8gKHRhcik7XG59XG5cbi8vIEFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdGhlbi9pcy1wcm9taXNlL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG4vLyBEaXN0cmlidXRlZCB1bmRlciBNSVQgTGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vdGhlbi9pcy1wcm9taXNlL2Jsb2IvbWFzdGVyL0xJQ0VOU0Vcbi8qKlxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJucyB7dmFsdWUgaXMgUHJvbWlzZUxpa2U8YW55Pn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcblx0cmV0dXJuIChcblx0XHQhIXZhbHVlICYmXG5cdFx0KHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSAmJlxuXHRcdHR5cGVvZiAoLyoqIEB0eXBlIHthbnl9ICovICh2YWx1ZSkudGhlbikgPT09ICdmdW5jdGlvbidcblx0KTtcbn1cblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZF9sb2NhdGlvbihlbGVtZW50LCBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIpIHtcblx0ZWxlbWVudC5fX3N2ZWx0ZV9tZXRhID0ge1xuXHRcdGxvYzogeyBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIgfVxuXHR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuKGZuKSB7XG5cdHJldHVybiBmbigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmxhbmtfb2JqZWN0KCkge1xuXHRyZXR1cm4gT2JqZWN0LmNyZWF0ZShudWxsKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9uW119IGZuc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBydW5fYWxsKGZucykge1xuXHRmbnMuZm9yRWFjaChydW4pO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7YW55fSB0aGluZ1xuICogQHJldHVybnMge3RoaW5nIGlzIEZ1bmN0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcblx0cmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqIEByZXR1cm5zIHtib29sZWFufSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVfbm90X2VxdWFsKGEsIGIpIHtcblx0cmV0dXJuIGEgIT0gYSA/IGIgPT0gYiA6IGEgIT09IGIgfHwgKGEgJiYgdHlwZW9mIGEgPT09ICdvYmplY3QnKSB8fCB0eXBlb2YgYSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxubGV0IHNyY191cmxfZXF1YWxfYW5jaG9yO1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBlbGVtZW50X3NyY1xuICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzcmNfdXJsX2VxdWFsKGVsZW1lbnRfc3JjLCB1cmwpIHtcblx0aWYgKGVsZW1lbnRfc3JjID09PSB1cmwpIHJldHVybiB0cnVlO1xuXHRpZiAoIXNyY191cmxfZXF1YWxfYW5jaG9yKSB7XG5cdFx0c3JjX3VybF9lcXVhbF9hbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cdH1cblx0Ly8gVGhpcyBpcyBhY3R1YWxseSBmYXN0ZXIgdGhhbiBkb2luZyBVUkwoLi4pLmhyZWZcblx0c3JjX3VybF9lcXVhbF9hbmNob3IuaHJlZiA9IHVybDtcblx0cmV0dXJuIGVsZW1lbnRfc3JjID09PSBzcmNfdXJsX2VxdWFsX2FuY2hvci5ocmVmO1xufVxuXG4vKiogQHBhcmFtIHtzdHJpbmd9IHNyY3NldCAqL1xuZnVuY3Rpb24gc3BsaXRfc3Jjc2V0KHNyY3NldCkge1xuXHRyZXR1cm4gc3Jjc2V0LnNwbGl0KCcsJykubWFwKChzcmMpID0+IHNyYy50cmltKCkuc3BsaXQoJyAnKS5maWx0ZXIoQm9vbGVhbikpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7SFRNTFNvdXJjZUVsZW1lbnQgfCBIVE1MSW1hZ2VFbGVtZW50fSBlbGVtZW50X3NyY3NldFxuICogQHBhcmFtIHtzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsfSBzcmNzZXRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3Jjc2V0X3VybF9lcXVhbChlbGVtZW50X3NyY3NldCwgc3Jjc2V0KSB7XG5cdGNvbnN0IGVsZW1lbnRfdXJscyA9IHNwbGl0X3NyY3NldChlbGVtZW50X3NyY3NldC5zcmNzZXQpO1xuXHRjb25zdCB1cmxzID0gc3BsaXRfc3Jjc2V0KHNyY3NldCB8fCAnJyk7XG5cblx0cmV0dXJuIChcblx0XHR1cmxzLmxlbmd0aCA9PT0gZWxlbWVudF91cmxzLmxlbmd0aCAmJlxuXHRcdHVybHMuZXZlcnkoXG5cdFx0XHQoW3VybCwgd2lkdGhdLCBpKSA9PlxuXHRcdFx0XHR3aWR0aCA9PT0gZWxlbWVudF91cmxzW2ldWzFdICYmXG5cdFx0XHRcdC8vIFdlIG5lZWQgdG8gdGVzdCBib3RoIHdheXMgYmVjYXVzZSBWaXRlIHdpbGwgY3JlYXRlIGFuIGEgZnVsbCBVUkwgd2l0aFxuXHRcdFx0XHQvLyBgbmV3IFVSTChhc3NldCwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmYCBmb3IgdGhlIGNsaWVudCB3aGVuIGBiYXNlOiAnLi8nYCwgYW5kIHRoZVxuXHRcdFx0XHQvLyByZWxhdGl2ZSBVUkxzIGluc2lkZSBzcmNzZXQgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IHJlc29sdmVkIHRvIGFic29sdXRlIFVSTHMgYnlcblx0XHRcdFx0Ly8gYnJvd3NlcnMgKGluIGNvbnRyYXN0IHRvIGltZy5zcmMpLiBUaGlzIG1lYW5zIGJvdGggU1NSIGFuZCBET00gY29kZSBjb3VsZFxuXHRcdFx0XHQvLyBjb250YWluIHJlbGF0aXZlIG9yIGFic29sdXRlIFVSTHMuXG5cdFx0XHRcdChzcmNfdXJsX2VxdWFsKGVsZW1lbnRfdXJsc1tpXVswXSwgdXJsKSB8fCBzcmNfdXJsX2VxdWFsKHVybCwgZWxlbWVudF91cmxzW2ldWzBdKSlcblx0XHQpXG5cdCk7XG59XG5cbi8qKiBAcmV0dXJucyB7Ym9vbGVhbn0gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RfZXF1YWwoYSwgYikge1xuXHRyZXR1cm4gYSAhPSBhID8gYiA9PSBiIDogYSAhPT0gYjtcbn1cblxuLyoqIEByZXR1cm5zIHtib29sZWFufSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX2VtcHR5KG9iaikge1xuXHRyZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDA7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZV9zdG9yZShzdG9yZSwgbmFtZSkge1xuXHRpZiAoc3RvcmUgIT0gbnVsbCAmJiB0eXBlb2Ygc3RvcmUuc3Vic2NyaWJlICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGAnJHtuYW1lfScgaXMgbm90IGEgc3RvcmUgd2l0aCBhICdzdWJzY3JpYmUnIG1ldGhvZGApO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdWJzY3JpYmUoc3RvcmUsIC4uLmNhbGxiYWNrcykge1xuXHRpZiAoc3RvcmUgPT0gbnVsbCkge1xuXHRcdGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG5cdFx0XHRjYWxsYmFjayh1bmRlZmluZWQpO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9vcDtcblx0fVxuXHRjb25zdCB1bnN1YiA9IHN0b3JlLnN1YnNjcmliZSguLi5jYWxsYmFja3MpO1xuXHRyZXR1cm4gdW5zdWIudW5zdWJzY3JpYmUgPyAoKSA9PiB1bnN1Yi51bnN1YnNjcmliZSgpIDogdW5zdWI7XG59XG5cbi8qKlxuICogR2V0IHRoZSBjdXJyZW50IHZhbHVlIGZyb20gYSBzdG9yZSBieSBzdWJzY3JpYmluZyBhbmQgaW1tZWRpYXRlbHkgdW5zdWJzY3JpYmluZy5cbiAqXG4gKiBodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUtc3RvcmUjZ2V0XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtpbXBvcnQoJy4uL3N0b3JlL3B1YmxpYy5qcycpLlJlYWRhYmxlPFQ+fSBzdG9yZVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRfc3RvcmVfdmFsdWUoc3RvcmUpIHtcblx0bGV0IHZhbHVlO1xuXHRzdWJzY3JpYmUoc3RvcmUsIChfKSA9PiAodmFsdWUgPSBfKSkoKTtcblx0cmV0dXJuIHZhbHVlO1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gY29tcG9uZW50X3N1YnNjcmliZShjb21wb25lbnQsIHN0b3JlLCBjYWxsYmFjaykge1xuXHRjb21wb25lbnQuJCQub25fZGVzdHJveS5wdXNoKHN1YnNjcmliZShzdG9yZSwgY2FsbGJhY2spKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9zbG90KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pIHtcblx0aWYgKGRlZmluaXRpb24pIHtcblx0XHRjb25zdCBzbG90X2N0eCA9IGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbik7XG5cdFx0cmV0dXJuIGRlZmluaXRpb25bMF0oc2xvdF9jdHgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbikge1xuXHRyZXR1cm4gZGVmaW5pdGlvblsxXSAmJiBmbiA/IGFzc2lnbigkJHNjb3BlLmN0eC5zbGljZSgpLCBkZWZpbml0aW9uWzFdKGZuKGN0eCkpKSA6ICQkc2NvcGUuY3R4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3Nsb3RfY2hhbmdlcyhkZWZpbml0aW9uLCAkJHNjb3BlLCBkaXJ0eSwgZm4pIHtcblx0aWYgKGRlZmluaXRpb25bMl0gJiYgZm4pIHtcblx0XHRjb25zdCBsZXRzID0gZGVmaW5pdGlvblsyXShmbihkaXJ0eSkpO1xuXHRcdGlmICgkJHNjb3BlLmRpcnR5ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiBsZXRzO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIGxldHMgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRjb25zdCBtZXJnZWQgPSBbXTtcblx0XHRcdGNvbnN0IGxlbiA9IE1hdGgubWF4KCQkc2NvcGUuZGlydHkubGVuZ3RoLCBsZXRzLmxlbmd0aCk7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSArPSAxKSB7XG5cdFx0XHRcdG1lcmdlZFtpXSA9ICQkc2NvcGUuZGlydHlbaV0gfCBsZXRzW2ldO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1lcmdlZDtcblx0XHR9XG5cdFx0cmV0dXJuICQkc2NvcGUuZGlydHkgfCBsZXRzO1xuXHR9XG5cdHJldHVybiAkJHNjb3BlLmRpcnR5O1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlX3Nsb3RfYmFzZShcblx0c2xvdCxcblx0c2xvdF9kZWZpbml0aW9uLFxuXHRjdHgsXG5cdCQkc2NvcGUsXG5cdHNsb3RfY2hhbmdlcyxcblx0Z2V0X3Nsb3RfY29udGV4dF9mblxuKSB7XG5cdGlmIChzbG90X2NoYW5nZXMpIHtcblx0XHRjb25zdCBzbG90X2NvbnRleHQgPSBnZXRfc2xvdF9jb250ZXh0KHNsb3RfZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBnZXRfc2xvdF9jb250ZXh0X2ZuKTtcblx0XHRzbG90LnAoc2xvdF9jb250ZXh0LCBzbG90X2NoYW5nZXMpO1xuXHR9XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVfc2xvdChcblx0c2xvdCxcblx0c2xvdF9kZWZpbml0aW9uLFxuXHRjdHgsXG5cdCQkc2NvcGUsXG5cdGRpcnR5LFxuXHRnZXRfc2xvdF9jaGFuZ2VzX2ZuLFxuXHRnZXRfc2xvdF9jb250ZXh0X2ZuXG4pIHtcblx0Y29uc3Qgc2xvdF9jaGFuZ2VzID0gZ2V0X3Nsb3RfY2hhbmdlcyhzbG90X2RlZmluaXRpb24sICQkc2NvcGUsIGRpcnR5LCBnZXRfc2xvdF9jaGFuZ2VzX2ZuKTtcblx0dXBkYXRlX3Nsb3RfYmFzZShzbG90LCBzbG90X2RlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgc2xvdF9jaGFuZ2VzLCBnZXRfc2xvdF9jb250ZXh0X2ZuKTtcbn1cblxuLyoqIEByZXR1cm5zIHthbnlbXSB8IC0xfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9hbGxfZGlydHlfZnJvbV9zY29wZSgkJHNjb3BlKSB7XG5cdGlmICgkJHNjb3BlLmN0eC5sZW5ndGggPiAzMikge1xuXHRcdGNvbnN0IGRpcnR5ID0gW107XG5cdFx0Y29uc3QgbGVuZ3RoID0gJCRzY29wZS5jdHgubGVuZ3RoIC8gMzI7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0ZGlydHlbaV0gPSAtMTtcblx0XHR9XG5cdFx0cmV0dXJuIGRpcnR5O1xuXHR9XG5cdHJldHVybiAtMTtcbn1cblxuLyoqIEByZXR1cm5zIHt7fX0gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGNsdWRlX2ludGVybmFsX3Byb3BzKHByb3BzKSB7XG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xuXHRmb3IgKGNvbnN0IGsgaW4gcHJvcHMpIGlmIChrWzBdICE9PSAnJCcpIHJlc3VsdFtrXSA9IHByb3BzW2tdO1xuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQHJldHVybnMge3t9fSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVfcmVzdF9wcm9wcyhwcm9wcywga2V5cykge1xuXHRjb25zdCByZXN0ID0ge307XG5cdGtleXMgPSBuZXcgU2V0KGtleXMpO1xuXHRmb3IgKGNvbnN0IGsgaW4gcHJvcHMpIGlmICgha2V5cy5oYXMoaykgJiYga1swXSAhPT0gJyQnKSByZXN0W2tdID0gcHJvcHNba107XG5cdHJldHVybiByZXN0O1xufVxuXG4vKiogQHJldHVybnMge3t9fSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVfc2xvdHMoc2xvdHMpIHtcblx0Y29uc3QgcmVzdWx0ID0ge307XG5cdGZvciAoY29uc3Qga2V5IGluIHNsb3RzKSB7XG5cdFx0cmVzdWx0W2tleV0gPSB0cnVlO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBAcmV0dXJucyB7KHRoaXM6IGFueSwgLi4uYXJnczogYW55W10pID0+IHZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gb25jZShmbikge1xuXHRsZXQgcmFuID0gZmFsc2U7XG5cdHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuXHRcdGlmIChyYW4pIHJldHVybjtcblx0XHRyYW4gPSB0cnVlO1xuXHRcdGZuLmNhbGwodGhpcywgLi4uYXJncyk7XG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBudWxsX3RvX2VtcHR5KHZhbHVlKSB7XG5cdHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldF9zdG9yZV92YWx1ZShzdG9yZSwgcmV0LCB2YWx1ZSkge1xuXHRzdG9yZS5zZXQodmFsdWUpO1xuXHRyZXR1cm4gcmV0O1xufVxuXG5leHBvcnQgY29uc3QgaGFzX3Byb3AgPSAob2JqLCBwcm9wKSA9PiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbl9kZXN0cm95ZXIoYWN0aW9uX3Jlc3VsdCkge1xuXHRyZXR1cm4gYWN0aW9uX3Jlc3VsdCAmJiBpc19mdW5jdGlvbihhY3Rpb25fcmVzdWx0LmRlc3Ryb3kpID8gYWN0aW9uX3Jlc3VsdC5kZXN0cm95IDogbm9vcDtcbn1cblxuLyoqIEBwYXJhbSB7bnVtYmVyIHwgc3RyaW5nfSB2YWx1ZVxuICogQHJldHVybnMge1tudW1iZXIsIHN0cmluZ119XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdF9jc3NfdW5pdCh2YWx1ZSkge1xuXHRjb25zdCBzcGxpdCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUubWF0Y2goL15cXHMqKC0/W1xcZC5dKykoW15cXHNdKilcXHMqJC8pO1xuXHRyZXR1cm4gc3BsaXQgPyBbcGFyc2VGbG9hdChzcGxpdFsxXSksIHNwbGl0WzJdIHx8ICdweCddIDogWy8qKiBAdHlwZSB7bnVtYmVyfSAqLyAodmFsdWUpLCAncHgnXTtcbn1cblxuZXhwb3J0IGNvbnN0IGNvbnRlbnRlZGl0YWJsZV90cnV0aHlfdmFsdWVzID0gWycnLCB0cnVlLCAxLCAndHJ1ZScsICdjb250ZW50ZWRpdGFibGUnXTtcbiIsImltcG9ydCB7IGNvbnRlbnRlZGl0YWJsZV90cnV0aHlfdmFsdWVzLCBoYXNfcHJvcCB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5pbXBvcnQgeyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbiB9IGZyb20gJy4vUmVzaXplT2JzZXJ2ZXJTaW5nbGV0b24uanMnO1xuXG4vLyBUcmFjayB3aGljaCBub2RlcyBhcmUgY2xhaW1lZCBkdXJpbmcgaHlkcmF0aW9uLiBVbmNsYWltZWQgbm9kZXMgY2FuIHRoZW4gYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbi8vIGF0IHRoZSBlbmQgb2YgaHlkcmF0aW9uIHdpdGhvdXQgdG91Y2hpbmcgdGhlIHJlbWFpbmluZyBub2Rlcy5cbmxldCBpc19oeWRyYXRpbmcgPSBmYWxzZTtcblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0X2h5ZHJhdGluZygpIHtcblx0aXNfaHlkcmF0aW5nID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZF9oeWRyYXRpbmcoKSB7XG5cdGlzX2h5ZHJhdGluZyA9IGZhbHNlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7bnVtYmVyfSBsb3dcbiAqIEBwYXJhbSB7bnVtYmVyfSBoaWdoXG4gKiBAcGFyYW0geyhpbmRleDogbnVtYmVyKSA9PiBudW1iZXJ9IGtleVxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiB1cHBlcl9ib3VuZChsb3csIGhpZ2gsIGtleSwgdmFsdWUpIHtcblx0Ly8gUmV0dXJuIGZpcnN0IGluZGV4IG9mIHZhbHVlIGxhcmdlciB0aGFuIGlucHV0IHZhbHVlIGluIHRoZSByYW5nZSBbbG93LCBoaWdoKVxuXHR3aGlsZSAobG93IDwgaGlnaCkge1xuXHRcdGNvbnN0IG1pZCA9IGxvdyArICgoaGlnaCAtIGxvdykgPj4gMSk7XG5cdFx0aWYgKGtleShtaWQpIDw9IHZhbHVlKSB7XG5cdFx0XHRsb3cgPSBtaWQgKyAxO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRoaWdoID0gbWlkO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbG93O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Tm9kZUV4fSB0YXJnZXRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5mdW5jdGlvbiBpbml0X2h5ZHJhdGUodGFyZ2V0KSB7XG5cdGlmICh0YXJnZXQuaHlkcmF0ZV9pbml0KSByZXR1cm47XG5cdHRhcmdldC5oeWRyYXRlX2luaXQgPSB0cnVlO1xuXHQvLyBXZSBrbm93IHRoYXQgYWxsIGNoaWxkcmVuIGhhdmUgY2xhaW1fb3JkZXIgdmFsdWVzIHNpbmNlIHRoZSB1bmNsYWltZWQgaGF2ZSBiZWVuIGRldGFjaGVkIGlmIHRhcmdldCBpcyBub3QgPGhlYWQ+XG5cblx0bGV0IGNoaWxkcmVuID0gLyoqIEB0eXBlIHtBcnJheUxpa2U8Tm9kZUV4Mj59ICovICh0YXJnZXQuY2hpbGROb2Rlcyk7XG5cdC8vIElmIHRhcmdldCBpcyA8aGVhZD4sIHRoZXJlIG1heSBiZSBjaGlsZHJlbiB3aXRob3V0IGNsYWltX29yZGVyXG5cdGlmICh0YXJnZXQubm9kZU5hbWUgPT09ICdIRUFEJykge1xuXHRcdGNvbnN0IG15X2NoaWxkcmVuID0gW107XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0Y29uc3Qgbm9kZSA9IGNoaWxkcmVuW2ldO1xuXHRcdFx0aWYgKG5vZGUuY2xhaW1fb3JkZXIgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRteV9jaGlsZHJlbi5wdXNoKG5vZGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjaGlsZHJlbiA9IG15X2NoaWxkcmVuO1xuXHR9XG5cdC8qXG5cdCAqIFJlb3JkZXIgY2xhaW1lZCBjaGlsZHJlbiBvcHRpbWFsbHkuXG5cdCAqIFdlIGNhbiByZW9yZGVyIGNsYWltZWQgY2hpbGRyZW4gb3B0aW1hbGx5IGJ5IGZpbmRpbmcgdGhlIGxvbmdlc3Qgc3Vic2VxdWVuY2Ugb2Zcblx0ICogbm9kZXMgdGhhdCBhcmUgYWxyZWFkeSBjbGFpbWVkIGluIG9yZGVyIGFuZCBvbmx5IG1vdmluZyB0aGUgcmVzdC4gVGhlIGxvbmdlc3Rcblx0ICogc3Vic2VxdWVuY2Ugb2Ygbm9kZXMgdGhhdCBhcmUgY2xhaW1lZCBpbiBvcmRlciBjYW4gYmUgZm91bmQgYnlcblx0ICogY29tcHV0aW5nIHRoZSBsb25nZXN0IGluY3JlYXNpbmcgc3Vic2VxdWVuY2Ugb2YgLmNsYWltX29yZGVyIHZhbHVlcy5cblx0ICpcblx0ICogVGhpcyBhbGdvcml0aG0gaXMgb3B0aW1hbCBpbiBnZW5lcmF0aW5nIHRoZSBsZWFzdCBhbW91bnQgb2YgcmVvcmRlciBvcGVyYXRpb25zXG5cdCAqIHBvc3NpYmxlLlxuXHQgKlxuXHQgKiBQcm9vZjpcblx0ICogV2Uga25vdyB0aGF0LCBnaXZlbiBhIHNldCBvZiByZW9yZGVyaW5nIG9wZXJhdGlvbnMsIHRoZSBub2RlcyB0aGF0IGRvIG5vdCBtb3ZlXG5cdCAqIGFsd2F5cyBmb3JtIGFuIGluY3JlYXNpbmcgc3Vic2VxdWVuY2UsIHNpbmNlIHRoZXkgZG8gbm90IG1vdmUgYW1vbmcgZWFjaCBvdGhlclxuXHQgKiBtZWFuaW5nIHRoYXQgdGhleSBtdXN0IGJlIGFscmVhZHkgb3JkZXJlZCBhbW9uZyBlYWNoIG90aGVyLiBUaHVzLCB0aGUgbWF4aW1hbFxuXHQgKiBzZXQgb2Ygbm9kZXMgdGhhdCBkbyBub3QgbW92ZSBmb3JtIGEgbG9uZ2VzdCBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlLlxuXHQgKi9cblx0Ly8gQ29tcHV0ZSBsb25nZXN0IGluY3JlYXNpbmcgc3Vic2VxdWVuY2Vcblx0Ly8gbTogc3Vic2VxdWVuY2UgbGVuZ3RoIGogPT4gaW5kZXggayBvZiBzbWFsbGVzdCB2YWx1ZSB0aGF0IGVuZHMgYW4gaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSBvZiBsZW5ndGggalxuXHRjb25zdCBtID0gbmV3IEludDMyQXJyYXkoY2hpbGRyZW4ubGVuZ3RoICsgMSk7XG5cdC8vIFByZWRlY2Vzc29yIGluZGljZXMgKyAxXG5cdGNvbnN0IHAgPSBuZXcgSW50MzJBcnJheShjaGlsZHJlbi5sZW5ndGgpO1xuXHRtWzBdID0gLTE7XG5cdGxldCBsb25nZXN0ID0gMDtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdGNvbnN0IGN1cnJlbnQgPSBjaGlsZHJlbltpXS5jbGFpbV9vcmRlcjtcblx0XHQvLyBGaW5kIHRoZSBsYXJnZXN0IHN1YnNlcXVlbmNlIGxlbmd0aCBzdWNoIHRoYXQgaXQgZW5kcyBpbiBhIHZhbHVlIGxlc3MgdGhhbiBvdXIgY3VycmVudCB2YWx1ZVxuXHRcdC8vIHVwcGVyX2JvdW5kIHJldHVybnMgZmlyc3QgZ3JlYXRlciB2YWx1ZSwgc28gd2Ugc3VidHJhY3Qgb25lXG5cdFx0Ly8gd2l0aCBmYXN0IHBhdGggZm9yIHdoZW4gd2UgYXJlIG9uIHRoZSBjdXJyZW50IGxvbmdlc3Qgc3Vic2VxdWVuY2Vcblx0XHRjb25zdCBzZXFfbGVuID1cblx0XHRcdChsb25nZXN0ID4gMCAmJiBjaGlsZHJlblttW2xvbmdlc3RdXS5jbGFpbV9vcmRlciA8PSBjdXJyZW50XG5cdFx0XHRcdD8gbG9uZ2VzdCArIDFcblx0XHRcdFx0OiB1cHBlcl9ib3VuZCgxLCBsb25nZXN0LCAoaWR4KSA9PiBjaGlsZHJlblttW2lkeF1dLmNsYWltX29yZGVyLCBjdXJyZW50KSkgLSAxO1xuXHRcdHBbaV0gPSBtW3NlcV9sZW5dICsgMTtcblx0XHRjb25zdCBuZXdfbGVuID0gc2VxX2xlbiArIDE7XG5cdFx0Ly8gV2UgY2FuIGd1YXJhbnRlZSB0aGF0IGN1cnJlbnQgaXMgdGhlIHNtYWxsZXN0IHZhbHVlLiBPdGhlcndpc2UsIHdlIHdvdWxkIGhhdmUgZ2VuZXJhdGVkIGEgbG9uZ2VyIHNlcXVlbmNlLlxuXHRcdG1bbmV3X2xlbl0gPSBpO1xuXHRcdGxvbmdlc3QgPSBNYXRoLm1heChuZXdfbGVuLCBsb25nZXN0KTtcblx0fVxuXHQvLyBUaGUgbG9uZ2VzdCBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlIG9mIG5vZGVzIChpbml0aWFsbHkgcmV2ZXJzZWQpXG5cblx0LyoqXG5cdCAqIEB0eXBlIHtOb2RlRXgyW119XG5cdCAqL1xuXHRjb25zdCBsaXMgPSBbXTtcblx0Ly8gVGhlIHJlc3Qgb2YgdGhlIG5vZGVzLCBub2RlcyB0aGF0IHdpbGwgYmUgbW92ZWRcblxuXHQvKipcblx0ICogQHR5cGUge05vZGVFeDJbXX1cblx0ICovXG5cdGNvbnN0IHRvX21vdmUgPSBbXTtcblx0bGV0IGxhc3QgPSBjaGlsZHJlbi5sZW5ndGggLSAxO1xuXHRmb3IgKGxldCBjdXIgPSBtW2xvbmdlc3RdICsgMTsgY3VyICE9IDA7IGN1ciA9IHBbY3VyIC0gMV0pIHtcblx0XHRsaXMucHVzaChjaGlsZHJlbltjdXIgLSAxXSk7XG5cdFx0Zm9yICg7IGxhc3QgPj0gY3VyOyBsYXN0LS0pIHtcblx0XHRcdHRvX21vdmUucHVzaChjaGlsZHJlbltsYXN0XSk7XG5cdFx0fVxuXHRcdGxhc3QtLTtcblx0fVxuXHRmb3IgKDsgbGFzdCA+PSAwOyBsYXN0LS0pIHtcblx0XHR0b19tb3ZlLnB1c2goY2hpbGRyZW5bbGFzdF0pO1xuXHR9XG5cdGxpcy5yZXZlcnNlKCk7XG5cdC8vIFdlIHNvcnQgdGhlIG5vZGVzIGJlaW5nIG1vdmVkIHRvIGd1YXJhbnRlZSB0aGF0IHRoZWlyIGluc2VydGlvbiBvcmRlciBtYXRjaGVzIHRoZSBjbGFpbSBvcmRlclxuXHR0b19tb3ZlLnNvcnQoKGEsIGIpID0+IGEuY2xhaW1fb3JkZXIgLSBiLmNsYWltX29yZGVyKTtcblx0Ly8gRmluYWxseSwgd2UgbW92ZSB0aGUgbm9kZXNcblx0Zm9yIChsZXQgaSA9IDAsIGogPSAwOyBpIDwgdG9fbW92ZS5sZW5ndGg7IGkrKykge1xuXHRcdHdoaWxlIChqIDwgbGlzLmxlbmd0aCAmJiB0b19tb3ZlW2ldLmNsYWltX29yZGVyID49IGxpc1tqXS5jbGFpbV9vcmRlcikge1xuXHRcdFx0aisrO1xuXHRcdH1cblx0XHRjb25zdCBhbmNob3IgPSBqIDwgbGlzLmxlbmd0aCA/IGxpc1tqXSA6IG51bGw7XG5cdFx0dGFyZ2V0Lmluc2VydEJlZm9yZSh0b19tb3ZlW2ldLCBhbmNob3IpO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmQodGFyZ2V0LCBub2RlKSB7XG5cdHRhcmdldC5hcHBlbmRDaGlsZChub2RlKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtzdHJpbmd9IHN0eWxlX3NoZWV0X2lkXG4gKiBAcGFyYW0ge3N0cmluZ30gc3R5bGVzXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZF9zdHlsZXModGFyZ2V0LCBzdHlsZV9zaGVldF9pZCwgc3R5bGVzKSB7XG5cdGNvbnN0IGFwcGVuZF9zdHlsZXNfdG8gPSBnZXRfcm9vdF9mb3Jfc3R5bGUodGFyZ2V0KTtcblx0aWYgKCFhcHBlbmRfc3R5bGVzX3RvLmdldEVsZW1lbnRCeUlkKHN0eWxlX3NoZWV0X2lkKSkge1xuXHRcdGNvbnN0IHN0eWxlID0gZWxlbWVudCgnc3R5bGUnKTtcblx0XHRzdHlsZS5pZCA9IHN0eWxlX3NoZWV0X2lkO1xuXHRcdHN0eWxlLnRleHRDb250ZW50ID0gc3R5bGVzO1xuXHRcdGFwcGVuZF9zdHlsZXNoZWV0KGFwcGVuZF9zdHlsZXNfdG8sIHN0eWxlKTtcblx0fVxufVxuXG4vKipcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybnMge1NoYWRvd1Jvb3QgfCBEb2N1bWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9yb290X2Zvcl9zdHlsZShub2RlKSB7XG5cdGlmICghbm9kZSkgcmV0dXJuIGRvY3VtZW50O1xuXHRjb25zdCByb290ID0gbm9kZS5nZXRSb290Tm9kZSA/IG5vZGUuZ2V0Um9vdE5vZGUoKSA6IG5vZGUub3duZXJEb2N1bWVudDtcblx0aWYgKHJvb3QgJiYgLyoqIEB0eXBlIHtTaGFkb3dSb290fSAqLyAocm9vdCkuaG9zdCkge1xuXHRcdHJldHVybiAvKiogQHR5cGUge1NoYWRvd1Jvb3R9ICovIChyb290KTtcblx0fVxuXHRyZXR1cm4gbm9kZS5vd25lckRvY3VtZW50O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybnMge0NTU1N0eWxlU2hlZXR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRfZW1wdHlfc3R5bGVzaGVldChub2RlKSB7XG5cdGNvbnN0IHN0eWxlX2VsZW1lbnQgPSBlbGVtZW50KCdzdHlsZScpO1xuXHQvLyBGb3IgdHJhbnNpdGlvbnMgdG8gd29yayB3aXRob3V0ICdzdHlsZS1zcmM6IHVuc2FmZS1pbmxpbmUnIENvbnRlbnQgU2VjdXJpdHkgUG9saWN5LFxuXHQvLyB0aGVzZSBlbXB0eSB0YWdzIG5lZWQgdG8gYmUgYWxsb3dlZCB3aXRoIGEgaGFzaCBhcyBhIHdvcmthcm91bmQgdW50aWwgd2UgbW92ZSB0byB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJLlxuXHQvLyBVc2luZyB0aGUgaGFzaCBmb3IgdGhlIGVtcHR5IHN0cmluZyAoZm9yIGFuIGVtcHR5IHRhZykgd29ya3MgaW4gYWxsIGJyb3dzZXJzIGV4Y2VwdCBTYWZhcmkuXG5cdC8vIFNvIGFzIGEgd29ya2Fyb3VuZCBmb3IgdGhlIHdvcmthcm91bmQsIHdoZW4gd2UgYXBwZW5kIGVtcHR5IHN0eWxlIHRhZ3Mgd2Ugc2V0IHRoZWlyIGNvbnRlbnQgdG8gLyogZW1wdHkgKi8uXG5cdC8vIFRoZSBoYXNoICdzaGEyNTYtOU9sTk8wRE5FZWFWekhMNFJad0NMc0JIQThXQlE4dG9CcC80RjVYVjJuYz0nIHdpbGwgdGhlbiB3b3JrIGV2ZW4gaW4gU2FmYXJpLlxuXHRzdHlsZV9lbGVtZW50LnRleHRDb250ZW50ID0gJy8qIGVtcHR5ICovJztcblx0YXBwZW5kX3N0eWxlc2hlZXQoZ2V0X3Jvb3RfZm9yX3N0eWxlKG5vZGUpLCBzdHlsZV9lbGVtZW50KTtcblx0cmV0dXJuIHN0eWxlX2VsZW1lbnQuc2hlZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtTaGFkb3dSb290IHwgRG9jdW1lbnR9IG5vZGVcbiAqIEBwYXJhbSB7SFRNTFN0eWxlRWxlbWVudH0gc3R5bGVcbiAqIEByZXR1cm5zIHtDU1NTdHlsZVNoZWV0fVxuICovXG5mdW5jdGlvbiBhcHBlbmRfc3R5bGVzaGVldChub2RlLCBzdHlsZSkge1xuXHRhcHBlbmQoLyoqIEB0eXBlIHtEb2N1bWVudH0gKi8gKG5vZGUpLmhlYWQgfHwgbm9kZSwgc3R5bGUpO1xuXHRyZXR1cm4gc3R5bGUuc2hlZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOb2RlRXh9IHRhcmdldFxuICogQHBhcmFtIHtOb2RlRXh9IG5vZGVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kX2h5ZHJhdGlvbih0YXJnZXQsIG5vZGUpIHtcblx0aWYgKGlzX2h5ZHJhdGluZykge1xuXHRcdGluaXRfaHlkcmF0ZSh0YXJnZXQpO1xuXHRcdGlmIChcblx0XHRcdHRhcmdldC5hY3R1YWxfZW5kX2NoaWxkID09PSB1bmRlZmluZWQgfHxcblx0XHRcdCh0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCAhPT0gbnVsbCAmJiB0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZC5wYXJlbnROb2RlICE9PSB0YXJnZXQpXG5cdFx0KSB7XG5cdFx0XHR0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCA9IHRhcmdldC5maXJzdENoaWxkO1xuXHRcdH1cblx0XHQvLyBTa2lwIG5vZGVzIG9mIHVuZGVmaW5lZCBvcmRlcmluZ1xuXHRcdHdoaWxlICh0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCAhPT0gbnVsbCAmJiB0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZC5jbGFpbV9vcmRlciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCA9IHRhcmdldC5hY3R1YWxfZW5kX2NoaWxkLm5leHRTaWJsaW5nO1xuXHRcdH1cblx0XHRpZiAobm9kZSAhPT0gdGFyZ2V0LmFjdHVhbF9lbmRfY2hpbGQpIHtcblx0XHRcdC8vIFdlIG9ubHkgaW5zZXJ0IGlmIHRoZSBvcmRlcmluZyBvZiB0aGlzIG5vZGUgc2hvdWxkIGJlIG1vZGlmaWVkIG9yIHRoZSBwYXJlbnQgbm9kZSBpcyBub3QgdGFyZ2V0XG5cdFx0XHRpZiAobm9kZS5jbGFpbV9vcmRlciAhPT0gdW5kZWZpbmVkIHx8IG5vZGUucGFyZW50Tm9kZSAhPT0gdGFyZ2V0KSB7XG5cdFx0XHRcdHRhcmdldC5pbnNlcnRCZWZvcmUobm9kZSwgdGFyZ2V0LmFjdHVhbF9lbmRfY2hpbGQpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCA9IG5vZGUubmV4dFNpYmxpbmc7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGFyZ2V0IHx8IG5vZGUubmV4dFNpYmxpbmcgIT09IG51bGwpIHtcblx0XHR0YXJnZXQuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcGFyYW0ge05vZGV9IFthbmNob3JdXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc2VydCh0YXJnZXQsIG5vZGUsIGFuY2hvcikge1xuXHR0YXJnZXQuaW5zZXJ0QmVmb3JlKG5vZGUsIGFuY2hvciB8fCBudWxsKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGVFeH0gdGFyZ2V0XG4gKiBAcGFyYW0ge05vZGVFeH0gbm9kZVxuICogQHBhcmFtIHtOb2RlRXh9IFthbmNob3JdXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc2VydF9oeWRyYXRpb24odGFyZ2V0LCBub2RlLCBhbmNob3IpIHtcblx0aWYgKGlzX2h5ZHJhdGluZyAmJiAhYW5jaG9yKSB7XG5cdFx0YXBwZW5kX2h5ZHJhdGlvbih0YXJnZXQsIG5vZGUpO1xuXHR9IGVsc2UgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGFyZ2V0IHx8IG5vZGUubmV4dFNpYmxpbmcgIT0gYW5jaG9yKSB7XG5cdFx0dGFyZ2V0Lmluc2VydEJlZm9yZShub2RlLCBhbmNob3IgfHwgbnVsbCk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0YWNoKG5vZGUpIHtcblx0aWYgKG5vZGUucGFyZW50Tm9kZSkge1xuXHRcdG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcblx0fVxufVxuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc3Ryb3lfZWFjaChpdGVyYXRpb25zLCBkZXRhY2hpbmcpIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpdGVyYXRpb25zLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0aWYgKGl0ZXJhdGlvbnNbaV0pIGl0ZXJhdGlvbnNbaV0uZChkZXRhY2hpbmcpO1xuXHR9XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIHtrZXlvZiBIVE1MRWxlbWVudFRhZ05hbWVNYXB9IEtcbiAqIEBwYXJhbSB7S30gbmFtZVxuICogQHJldHVybnMge0hUTUxFbGVtZW50VGFnTmFtZU1hcFtLXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnQobmFtZSkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKTtcbn1cblxuLyoqXG4gKiBAdGVtcGxhdGUge2tleW9mIEhUTUxFbGVtZW50VGFnTmFtZU1hcH0gS1xuICogQHBhcmFtIHtLfSBuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gaXNcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudFRhZ05hbWVNYXBbS119XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50X2lzKG5hbWUsIGlzKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUsIHsgaXMgfSk7XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFRcbiAqIEB0ZW1wbGF0ZSB7a2V5b2YgVH0gS1xuICogQHBhcmFtIHtUfSBvYmpcbiAqIEBwYXJhbSB7S1tdfSBleGNsdWRlXG4gKiBAcmV0dXJucyB7UGljazxULCBFeGNsdWRlPGtleW9mIFQsIEs+Pn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9iamVjdF93aXRob3V0X3Byb3BlcnRpZXMob2JqLCBleGNsdWRlKSB7XG5cdGNvbnN0IHRhcmdldCA9IC8qKiBAdHlwZSB7UGljazxULCBFeGNsdWRlPGtleW9mIFQsIEs+Pn0gKi8gKHt9KTtcblx0Zm9yIChjb25zdCBrIGluIG9iaikge1xuXHRcdGlmIChcblx0XHRcdGhhc19wcm9wKG9iaiwgaykgJiZcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdGV4Y2x1ZGUuaW5kZXhPZihrKSA9PT0gLTFcblx0XHQpIHtcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdHRhcmdldFtrXSA9IG9ialtrXTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHRhcmdldDtcbn1cblxuLyoqXG4gKiBAdGVtcGxhdGUge2tleW9mIFNWR0VsZW1lbnRUYWdOYW1lTWFwfSBLXG4gKiBAcGFyYW0ge0t9IG5hbWVcbiAqIEByZXR1cm5zIHtTVkdFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ZnX2VsZW1lbnQobmFtZSkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIG5hbWUpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhXG4gKiBAcmV0dXJucyB7VGV4dH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHQoZGF0YSkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSk7XG59XG5cbi8qKlxuICogQHJldHVybnMge1RleHR9ICovXG5leHBvcnQgZnVuY3Rpb24gc3BhY2UoKSB7XG5cdHJldHVybiB0ZXh0KCcgJyk7XG59XG5cbi8qKlxuICogQHJldHVybnMge1RleHR9ICovXG5leHBvcnQgZnVuY3Rpb24gZW1wdHkoKSB7XG5cdHJldHVybiB0ZXh0KCcnKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gY29udGVudFxuICogQHJldHVybnMge0NvbW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tZW50KGNvbnRlbnQpIHtcblx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoY29udGVudCk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtFdmVudFRhcmdldH0gbm9kZVxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0V2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3R9IGhhbmRsZXJcbiAqIEBwYXJhbSB7Ym9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zIHwgRXZlbnRMaXN0ZW5lck9wdGlvbnN9IFtvcHRpb25zXVxuICogQHJldHVybnMgeygpID0+IHZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaXN0ZW4obm9kZSwgZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMpIHtcblx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcblx0cmV0dXJuICgpID0+IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQHJldHVybnMgeyhldmVudDogYW55KSA9PiBhbnl9ICovXG5leHBvcnQgZnVuY3Rpb24gcHJldmVudF9kZWZhdWx0KGZuKSB7XG5cdHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdC8vIEB0cy1pZ25vcmVcblx0XHRyZXR1cm4gZm4uY2FsbCh0aGlzLCBldmVudCk7XG5cdH07XG59XG5cbi8qKlxuICogQHJldHVybnMgeyhldmVudDogYW55KSA9PiBhbnl9ICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcF9wcm9wYWdhdGlvbihmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gQHRzLWlnbm9yZVxuXHRcdHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcblx0fTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7KGV2ZW50OiBhbnkpID0+IGFueX0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wX2ltbWVkaWF0ZV9wcm9wYWdhdGlvbihmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gQHRzLWlnbm9yZVxuXHRcdHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcblx0fTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7KGV2ZW50OiBhbnkpID0+IHZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gc2VsZihmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0Ly8gQHRzLWlnbm9yZVxuXHRcdGlmIChldmVudC50YXJnZXQgPT09IHRoaXMpIGZuLmNhbGwodGhpcywgZXZlbnQpO1xuXHR9O1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHsoZXZlbnQ6IGFueSkgPT4gdm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cnVzdGVkKGZuKSB7XG5cdHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHQvLyBAdHMtaWdub3JlXG5cdFx0aWYgKGV2ZW50LmlzVHJ1c3RlZCkgZm4uY2FsbCh0aGlzLCBldmVudCk7XG5cdH07XG59XG5cbi8qKlxuICogQHBhcmFtIHtFbGVtZW50fSBub2RlXG4gKiBAcGFyYW0ge3N0cmluZ30gYXR0cmlidXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gW3ZhbHVlXVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdHRyKG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcblx0aWYgKHZhbHVlID09IG51bGwpIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG5cdGVsc2UgaWYgKG5vZGUuZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IHZhbHVlKSBub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cbi8qKlxuICogTGlzdCBvZiBhdHRyaWJ1dGVzIHRoYXQgc2hvdWxkIGFsd2F5cyBiZSBzZXQgdGhyb3VnaCB0aGUgYXR0ciBtZXRob2QsXG4gKiBiZWNhdXNlIHVwZGF0aW5nIHRoZW0gdGhyb3VnaCB0aGUgcHJvcGVydHkgc2V0dGVyIGRvZXNuJ3Qgd29yayByZWxpYWJseS5cbiAqIEluIHRoZSBleGFtcGxlIG9mIGB3aWR0aGAvYGhlaWdodGAsIHRoZSBwcm9ibGVtIGlzIHRoYXQgdGhlIHNldHRlciBvbmx5XG4gKiBhY2NlcHRzIG51bWVyaWMgdmFsdWVzLCBidXQgdGhlIGF0dHJpYnV0ZSBjYW4gYWxzbyBiZSBzZXQgdG8gYSBzdHJpbmcgbGlrZSBgNTAlYC5cbiAqIElmIHRoaXMgbGlzdCBiZWNvbWVzIHRvbyBiaWcsIHJldGhpbmsgdGhpcyBhcHByb2FjaC5cbiAqL1xuY29uc3QgYWx3YXlzX3NldF90aHJvdWdoX3NldF9hdHRyaWJ1dGUgPSBbJ3dpZHRoJywgJ2hlaWdodCddO1xuXG4vKipcbiAqIEBwYXJhbSB7RWxlbWVudCAmIEVsZW1lbnRDU1NJbmxpbmVTdHlsZX0gbm9kZVxuICogQHBhcmFtIHt7IFt4OiBzdHJpbmddOiBzdHJpbmcgfX0gYXR0cmlidXRlc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfYXR0cmlidXRlcyhub2RlLCBhdHRyaWJ1dGVzKSB7XG5cdC8vIEB0cy1pZ25vcmVcblx0Y29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhub2RlLl9fcHJvdG9fXyk7XG5cdGZvciAoY29uc3Qga2V5IGluIGF0dHJpYnV0ZXMpIHtcblx0XHRpZiAoYXR0cmlidXRlc1trZXldID09IG51bGwpIHtcblx0XHRcdG5vZGUucmVtb3ZlQXR0cmlidXRlKGtleSk7XG5cdFx0fSBlbHNlIGlmIChrZXkgPT09ICdzdHlsZScpIHtcblx0XHRcdG5vZGUuc3R5bGUuY3NzVGV4dCA9IGF0dHJpYnV0ZXNba2V5XTtcblx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ19fdmFsdWUnKSB7XG5cdFx0XHQvKiogQHR5cGUge2FueX0gKi8gKG5vZGUpLnZhbHVlID0gbm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuXHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRkZXNjcmlwdG9yc1trZXldICYmXG5cdFx0XHRkZXNjcmlwdG9yc1trZXldLnNldCAmJlxuXHRcdFx0YWx3YXlzX3NldF90aHJvdWdoX3NldF9hdHRyaWJ1dGUuaW5kZXhPZihrZXkpID09PSAtMVxuXHRcdCkge1xuXHRcdFx0bm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhdHRyKG5vZGUsIGtleSwgYXR0cmlidXRlc1trZXldKTtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge0VsZW1lbnQgJiBFbGVtZW50Q1NTSW5saW5lU3R5bGV9IG5vZGVcbiAqIEBwYXJhbSB7eyBbeDogc3RyaW5nXTogc3RyaW5nIH19IGF0dHJpYnV0ZXNcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X3N2Z19hdHRyaWJ1dGVzKG5vZGUsIGF0dHJpYnV0ZXMpIHtcblx0Zm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuXHRcdGF0dHIobm9kZSwga2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtSZWNvcmQ8c3RyaW5nLCB1bmtub3duPn0gZGF0YV9tYXBcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2N1c3RvbV9lbGVtZW50X2RhdGFfbWFwKG5vZGUsIGRhdGFfbWFwKSB7XG5cdE9iamVjdC5rZXlzKGRhdGFfbWFwKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRzZXRfY3VzdG9tX2VsZW1lbnRfZGF0YShub2RlLCBrZXksIGRhdGFfbWFwW2tleV0pO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfY3VzdG9tX2VsZW1lbnRfZGF0YShub2RlLCBwcm9wLCB2YWx1ZSkge1xuXHRjb25zdCBsb3dlciA9IHByb3AudG9Mb3dlckNhc2UoKTsgLy8gZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggZXhpc3RpbmcgYmVoYXZpb3Igd2UgZG8gbG93ZXJjYXNlIGZpcnN0XG5cdGlmIChsb3dlciBpbiBub2RlKSB7XG5cdFx0bm9kZVtsb3dlcl0gPSB0eXBlb2Ygbm9kZVtsb3dlcl0gPT09ICdib29sZWFuJyAmJiB2YWx1ZSA9PT0gJycgPyB0cnVlIDogdmFsdWU7XG5cdH0gZWxzZSBpZiAocHJvcCBpbiBub2RlKSB7XG5cdFx0bm9kZVtwcm9wXSA9IHR5cGVvZiBub2RlW3Byb3BdID09PSAnYm9vbGVhbicgJiYgdmFsdWUgPT09ICcnID8gdHJ1ZSA6IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdGF0dHIobm9kZSwgcHJvcCwgdmFsdWUpO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2R5bmFtaWNfZWxlbWVudF9kYXRhKHRhZykge1xuXHRyZXR1cm4gLy0vLnRlc3QodGFnKSA/IHNldF9jdXN0b21fZWxlbWVudF9kYXRhX21hcCA6IHNldF9hdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24geGxpbmtfYXR0cihub2RlLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG5cdG5vZGUuc2V0QXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBub2RlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3N2ZWx0ZV9kYXRhc2V0KG5vZGUpIHtcblx0cmV0dXJuIG5vZGUuZGF0YXNldC5zdmVsdGVIO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHt1bmtub3duW119ICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X2JpbmRpbmdfZ3JvdXBfdmFsdWUoZ3JvdXAsIF9fdmFsdWUsIGNoZWNrZWQpIHtcblx0Y29uc3QgdmFsdWUgPSBuZXcgU2V0KCk7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXAubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRpZiAoZ3JvdXBbaV0uY2hlY2tlZCkgdmFsdWUuYWRkKGdyb3VwW2ldLl9fdmFsdWUpO1xuXHR9XG5cdGlmICghY2hlY2tlZCkge1xuXHRcdHZhbHVlLmRlbGV0ZShfX3ZhbHVlKTtcblx0fVxuXHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtIVE1MSW5wdXRFbGVtZW50W119IGdyb3VwXG4gKiBAcmV0dXJucyB7eyBwKC4uLmlucHV0czogSFRNTElucHV0RWxlbWVudFtdKTogdm9pZDsgcigpOiB2b2lkOyB9fVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdF9iaW5kaW5nX2dyb3VwKGdyb3VwKSB7XG5cdC8qKlxuXHQgKiBAdHlwZSB7SFRNTElucHV0RWxlbWVudFtdfSAqL1xuXHRsZXQgX2lucHV0cztcblx0cmV0dXJuIHtcblx0XHQvKiBwdXNoICovIHAoLi4uaW5wdXRzKSB7XG5cdFx0XHRfaW5wdXRzID0gaW5wdXRzO1xuXHRcdFx0X2lucHV0cy5mb3JFYWNoKChpbnB1dCkgPT4gZ3JvdXAucHVzaChpbnB1dCkpO1xuXHRcdH0sXG5cdFx0LyogcmVtb3ZlICovIHIoKSB7XG5cdFx0XHRfaW5wdXRzLmZvckVhY2goKGlucHV0KSA9PiBncm91cC5zcGxpY2UoZ3JvdXAuaW5kZXhPZihpbnB1dCksIDEpKTtcblx0XHR9XG5cdH07XG59XG5cbi8qKlxuICogQHBhcmFtIHtudW1iZXJbXX0gaW5kZXhlc1xuICogQHJldHVybnMge3sgdShuZXdfaW5kZXhlczogbnVtYmVyW10pOiB2b2lkOyBwKC4uLmlucHV0czogSFRNTElucHV0RWxlbWVudFtdKTogdm9pZDsgcjogKCkgPT4gdm9pZDsgfX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRfYmluZGluZ19ncm91cF9keW5hbWljKGdyb3VwLCBpbmRleGVzKSB7XG5cdC8qKlxuXHQgKiBAdHlwZSB7SFRNTElucHV0RWxlbWVudFtdfSAqL1xuXHRsZXQgX2dyb3VwID0gZ2V0X2JpbmRpbmdfZ3JvdXAoZ3JvdXApO1xuXG5cdC8qKlxuXHQgKiBAdHlwZSB7SFRNTElucHV0RWxlbWVudFtdfSAqL1xuXHRsZXQgX2lucHV0cztcblxuXHRmdW5jdGlvbiBnZXRfYmluZGluZ19ncm91cChncm91cCkge1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXhlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Z3JvdXAgPSBncm91cFtpbmRleGVzW2ldXSA9IGdyb3VwW2luZGV4ZXNbaV1dIHx8IFtdO1xuXHRcdH1cblx0XHRyZXR1cm4gZ3JvdXA7XG5cdH1cblxuXHQvKipcblx0ICogQHJldHVybnMge3ZvaWR9ICovXG5cdGZ1bmN0aW9uIHB1c2goKSB7XG5cdFx0X2lucHV0cy5mb3JFYWNoKChpbnB1dCkgPT4gX2dyb3VwLnB1c2goaW5wdXQpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcmV0dXJucyB7dm9pZH0gKi9cblx0ZnVuY3Rpb24gcmVtb3ZlKCkge1xuXHRcdF9pbnB1dHMuZm9yRWFjaCgoaW5wdXQpID0+IF9ncm91cC5zcGxpY2UoX2dyb3VwLmluZGV4T2YoaW5wdXQpLCAxKSk7XG5cdH1cblx0cmV0dXJuIHtcblx0XHQvKiB1cGRhdGUgKi8gdShuZXdfaW5kZXhlcykge1xuXHRcdFx0aW5kZXhlcyA9IG5ld19pbmRleGVzO1xuXHRcdFx0Y29uc3QgbmV3X2dyb3VwID0gZ2V0X2JpbmRpbmdfZ3JvdXAoZ3JvdXApO1xuXHRcdFx0aWYgKG5ld19ncm91cCAhPT0gX2dyb3VwKSB7XG5cdFx0XHRcdHJlbW92ZSgpO1xuXHRcdFx0XHRfZ3JvdXAgPSBuZXdfZ3JvdXA7XG5cdFx0XHRcdHB1c2goKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdC8qIHB1c2ggKi8gcCguLi5pbnB1dHMpIHtcblx0XHRcdF9pbnB1dHMgPSBpbnB1dHM7XG5cdFx0XHRwdXNoKCk7XG5cdFx0fSxcblx0XHQvKiByZW1vdmUgKi8gcjogcmVtb3ZlXG5cdH07XG59XG5cbi8qKiBAcmV0dXJucyB7bnVtYmVyfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvX251bWJlcih2YWx1ZSkge1xuXHRyZXR1cm4gdmFsdWUgPT09ICcnID8gbnVsbCA6ICt2YWx1ZTtcbn1cblxuLyoqIEByZXR1cm5zIHthbnlbXX0gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aW1lX3Jhbmdlc190b19hcnJheShyYW5nZXMpIHtcblx0Y29uc3QgYXJyYXkgPSBbXTtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCByYW5nZXMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRhcnJheS5wdXNoKHsgc3RhcnQ6IHJhbmdlcy5zdGFydChpKSwgZW5kOiByYW5nZXMuZW5kKGkpIH0pO1xuXHR9XG5cdHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtDaGlsZE5vZGVbXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoaWxkcmVuKGVsZW1lbnQpIHtcblx0cmV0dXJuIEFycmF5LmZyb20oZWxlbWVudC5jaGlsZE5vZGVzKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0NoaWxkTm9kZUFycmF5fSBub2Rlc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmZ1bmN0aW9uIGluaXRfY2xhaW1faW5mbyhub2Rlcykge1xuXHRpZiAobm9kZXMuY2xhaW1faW5mbyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0bm9kZXMuY2xhaW1faW5mbyA9IHsgbGFzdF9pbmRleDogMCwgdG90YWxfY2xhaW1lZDogMCB9O1xuXHR9XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIHtDaGlsZE5vZGVFeH0gUlxuICogQHBhcmFtIHtDaGlsZE5vZGVBcnJheX0gbm9kZXNcbiAqIEBwYXJhbSB7KG5vZGU6IENoaWxkTm9kZUV4KSA9PiBub2RlIGlzIFJ9IHByZWRpY2F0ZVxuICogQHBhcmFtIHsobm9kZTogQ2hpbGROb2RlRXgpID0+IENoaWxkTm9kZUV4IHwgdW5kZWZpbmVkfSBwcm9jZXNzX25vZGVcbiAqIEBwYXJhbSB7KCkgPT4gUn0gY3JlYXRlX25vZGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gZG9udF91cGRhdGVfbGFzdF9pbmRleFxuICogQHJldHVybnMge1J9XG4gKi9cbmZ1bmN0aW9uIGNsYWltX25vZGUobm9kZXMsIHByZWRpY2F0ZSwgcHJvY2Vzc19ub2RlLCBjcmVhdGVfbm9kZSwgZG9udF91cGRhdGVfbGFzdF9pbmRleCA9IGZhbHNlKSB7XG5cdC8vIFRyeSB0byBmaW5kIG5vZGVzIGluIGFuIG9yZGVyIHN1Y2ggdGhhdCB3ZSBsZW5ndGhlbiB0aGUgbG9uZ2VzdCBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlXG5cdGluaXRfY2xhaW1faW5mbyhub2Rlcyk7XG5cdGNvbnN0IHJlc3VsdF9ub2RlID0gKCgpID0+IHtcblx0XHQvLyBXZSBmaXJzdCB0cnkgdG8gZmluZCBhbiBlbGVtZW50IGFmdGVyIHRoZSBwcmV2aW91cyBvbmVcblx0XHRmb3IgKGxldCBpID0gbm9kZXMuY2xhaW1faW5mby5sYXN0X2luZGV4OyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcblx0XHRcdGlmIChwcmVkaWNhdGUobm9kZSkpIHtcblx0XHRcdFx0Y29uc3QgcmVwbGFjZW1lbnQgPSBwcm9jZXNzX25vZGUobm9kZSk7XG5cdFx0XHRcdGlmIChyZXBsYWNlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0bm9kZXMuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG5vZGVzW2ldID0gcmVwbGFjZW1lbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFkb250X3VwZGF0ZV9sYXN0X2luZGV4KSB7XG5cdFx0XHRcdFx0bm9kZXMuY2xhaW1faW5mby5sYXN0X2luZGV4ID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbm9kZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlLCB3ZSB0cnkgdG8gZmluZCBvbmUgYmVmb3JlXG5cdFx0Ly8gV2UgaXRlcmF0ZSBpbiByZXZlcnNlIHNvIHRoYXQgd2UgZG9uJ3QgZ28gdG9vIGZhciBiYWNrXG5cdFx0Zm9yIChsZXQgaSA9IG5vZGVzLmNsYWltX2luZm8ubGFzdF9pbmRleCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRjb25zdCBub2RlID0gbm9kZXNbaV07XG5cdFx0XHRpZiAocHJlZGljYXRlKG5vZGUpKSB7XG5cdFx0XHRcdGNvbnN0IHJlcGxhY2VtZW50ID0gcHJvY2Vzc19ub2RlKG5vZGUpO1xuXHRcdFx0XHRpZiAocmVwbGFjZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdG5vZGVzLnNwbGljZShpLCAxKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRub2Rlc1tpXSA9IHJlcGxhY2VtZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghZG9udF91cGRhdGVfbGFzdF9pbmRleCkge1xuXHRcdFx0XHRcdG5vZGVzLmNsYWltX2luZm8ubGFzdF9pbmRleCA9IGk7XG5cdFx0XHRcdH0gZWxzZSBpZiAocmVwbGFjZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdC8vIFNpbmNlIHdlIHNwbGljZWQgYmVmb3JlIHRoZSBsYXN0X2luZGV4LCB3ZSBkZWNyZWFzZSBpdFxuXHRcdFx0XHRcdG5vZGVzLmNsYWltX2luZm8ubGFzdF9pbmRleC0tO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBub2RlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBJZiB3ZSBjYW4ndCBmaW5kIGFueSBtYXRjaGluZyBub2RlLCB3ZSBjcmVhdGUgYSBuZXcgb25lXG5cdFx0cmV0dXJuIGNyZWF0ZV9ub2RlKCk7XG5cdH0pKCk7XG5cdHJlc3VsdF9ub2RlLmNsYWltX29yZGVyID0gbm9kZXMuY2xhaW1faW5mby50b3RhbF9jbGFpbWVkO1xuXHRub2Rlcy5jbGFpbV9pbmZvLnRvdGFsX2NsYWltZWQgKz0gMTtcblx0cmV0dXJuIHJlc3VsdF9ub2RlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Q2hpbGROb2RlQXJyYXl9IG5vZGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHt7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfX0gYXR0cmlidXRlc1xuICogQHBhcmFtIHsobmFtZTogc3RyaW5nKSA9PiBFbGVtZW50IHwgU1ZHRWxlbWVudH0gY3JlYXRlX2VsZW1lbnRcbiAqIEByZXR1cm5zIHtFbGVtZW50IHwgU1ZHRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gY2xhaW1fZWxlbWVudF9iYXNlKG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzLCBjcmVhdGVfZWxlbWVudCkge1xuXHRyZXR1cm4gY2xhaW1fbm9kZShcblx0XHRub2Rlcyxcblx0XHQvKiogQHJldHVybnMge25vZGUgaXMgRWxlbWVudCB8IFNWR0VsZW1lbnR9ICovXG5cdFx0KG5vZGUpID0+IG5vZGUubm9kZU5hbWUgPT09IG5hbWUsXG5cdFx0LyoqIEBwYXJhbSB7RWxlbWVudH0gbm9kZSAqL1xuXHRcdChub2RlKSA9PiB7XG5cdFx0XHRjb25zdCByZW1vdmUgPSBbXTtcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGNvbnN0IGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tqXTtcblx0XHRcdFx0aWYgKCFhdHRyaWJ1dGVzW2F0dHJpYnV0ZS5uYW1lXSkge1xuXHRcdFx0XHRcdHJlbW92ZS5wdXNoKGF0dHJpYnV0ZS5uYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmVtb3ZlLmZvckVhY2goKHYpID0+IG5vZGUucmVtb3ZlQXR0cmlidXRlKHYpKTtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fSxcblx0XHQoKSA9PiBjcmVhdGVfZWxlbWVudChuYW1lKVxuXHQpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Q2hpbGROb2RlQXJyYXl9IG5vZGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHt7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfX0gYXR0cmlidXRlc1xuICogQHJldHVybnMge0VsZW1lbnQgfCBTVkdFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1fZWxlbWVudChub2RlcywgbmFtZSwgYXR0cmlidXRlcykge1xuXHRyZXR1cm4gY2xhaW1fZWxlbWVudF9iYXNlKG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzLCBlbGVtZW50KTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0NoaWxkTm9kZUFycmF5fSBub2Rlc1xuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7eyBba2V5OiBzdHJpbmddOiBib29sZWFuIH19IGF0dHJpYnV0ZXNcbiAqIEByZXR1cm5zIHtFbGVtZW50IHwgU1ZHRWxlbWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYWltX3N2Z19lbGVtZW50KG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzKSB7XG5cdHJldHVybiBjbGFpbV9lbGVtZW50X2Jhc2Uobm9kZXMsIG5hbWUsIGF0dHJpYnV0ZXMsIHN2Z19lbGVtZW50KTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0NoaWxkTm9kZUFycmF5fSBub2Rlc1xuICogQHJldHVybnMge1RleHR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFpbV90ZXh0KG5vZGVzLCBkYXRhKSB7XG5cdHJldHVybiBjbGFpbV9ub2RlKFxuXHRcdG5vZGVzLFxuXHRcdC8qKiBAcmV0dXJucyB7bm9kZSBpcyBUZXh0fSAqL1xuXHRcdChub2RlKSA9PiBub2RlLm5vZGVUeXBlID09PSAzLFxuXHRcdC8qKiBAcGFyYW0ge1RleHR9IG5vZGUgKi9cblx0XHQobm9kZSkgPT4ge1xuXHRcdFx0Y29uc3QgZGF0YV9zdHIgPSAnJyArIGRhdGE7XG5cdFx0XHRpZiAobm9kZS5kYXRhLnN0YXJ0c1dpdGgoZGF0YV9zdHIpKSB7XG5cdFx0XHRcdGlmIChub2RlLmRhdGEubGVuZ3RoICE9PSBkYXRhX3N0ci5sZW5ndGgpIHtcblx0XHRcdFx0XHRyZXR1cm4gbm9kZS5zcGxpdFRleHQoZGF0YV9zdHIubGVuZ3RoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZS5kYXRhID0gZGF0YV9zdHI7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQoKSA9PiB0ZXh0KGRhdGEpLFxuXHRcdHRydWUgLy8gVGV4dCBub2RlcyBzaG91bGQgbm90IHVwZGF0ZSBsYXN0IGluZGV4IHNpbmNlIGl0IGlzIGxpa2VseSBub3Qgd29ydGggaXQgdG8gZWxpbWluYXRlIGFuIGluY3JlYXNpbmcgc3Vic2VxdWVuY2Ugb2YgYWN0dWFsIGVsZW1lbnRzXG5cdCk7XG59XG5cbi8qKlxuICogQHJldHVybnMge1RleHR9ICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1fc3BhY2Uobm9kZXMpIHtcblx0cmV0dXJuIGNsYWltX3RleHQobm9kZXMsICcgJyk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtDaGlsZE5vZGVBcnJheX0gbm9kZXNcbiAqIEByZXR1cm5zIHtDb21tZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1fY29tbWVudChub2RlcywgZGF0YSkge1xuXHRyZXR1cm4gY2xhaW1fbm9kZShcblx0XHRub2Rlcyxcblx0XHQvKiogQHJldHVybnMge25vZGUgaXMgQ29tbWVudH0gKi9cblx0XHQobm9kZSkgPT4gbm9kZS5ub2RlVHlwZSA9PT0gOCxcblx0XHQvKiogQHBhcmFtIHtDb21tZW50fSBub2RlICovXG5cdFx0KG5vZGUpID0+IHtcblx0XHRcdG5vZGUuZGF0YSA9ICcnICsgZGF0YTtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fSxcblx0XHQoKSA9PiBjb21tZW50KGRhdGEpLFxuXHRcdHRydWVcblx0KTtcbn1cblxuZnVuY3Rpb24gZ2V0X2NvbW1lbnRfaWR4KG5vZGVzLCB0ZXh0LCBzdGFydCkge1xuXHRmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBub2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcblx0XHRpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCAvKiBjb21tZW50IG5vZGUgKi8gJiYgbm9kZS50ZXh0Q29udGVudC50cmltKCkgPT09IHRleHQpIHtcblx0XHRcdHJldHVybiBpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gLTE7XG59XG5cbi8qKlxuICogQHBhcmFtIHtib29sZWFufSBpc19zdmdcbiAqIEByZXR1cm5zIHtIdG1sVGFnSHlkcmF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1faHRtbF90YWcobm9kZXMsIGlzX3N2Zykge1xuXHQvLyBmaW5kIGh0bWwgb3BlbmluZyB0YWdcblx0Y29uc3Qgc3RhcnRfaW5kZXggPSBnZXRfY29tbWVudF9pZHgobm9kZXMsICdIVE1MX1RBR19TVEFSVCcsIDApO1xuXHRjb25zdCBlbmRfaW5kZXggPSBnZXRfY29tbWVudF9pZHgobm9kZXMsICdIVE1MX1RBR19FTkQnLCBzdGFydF9pbmRleCArIDEpO1xuXHRpZiAoc3RhcnRfaW5kZXggPT09IC0xIHx8IGVuZF9pbmRleCA9PT0gLTEpIHtcblx0XHRyZXR1cm4gbmV3IEh0bWxUYWdIeWRyYXRpb24oaXNfc3ZnKTtcblx0fVxuXG5cdGluaXRfY2xhaW1faW5mbyhub2Rlcyk7XG5cdGNvbnN0IGh0bWxfdGFnX25vZGVzID0gbm9kZXMuc3BsaWNlKHN0YXJ0X2luZGV4LCBlbmRfaW5kZXggLSBzdGFydF9pbmRleCArIDEpO1xuXHRkZXRhY2goaHRtbF90YWdfbm9kZXNbMF0pO1xuXHRkZXRhY2goaHRtbF90YWdfbm9kZXNbaHRtbF90YWdfbm9kZXMubGVuZ3RoIC0gMV0pO1xuXHRjb25zdCBjbGFpbWVkX25vZGVzID0gaHRtbF90YWdfbm9kZXMuc2xpY2UoMSwgaHRtbF90YWdfbm9kZXMubGVuZ3RoIC0gMSk7XG5cdGlmIChjbGFpbWVkX25vZGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHJldHVybiBuZXcgSHRtbFRhZ0h5ZHJhdGlvbihpc19zdmcpO1xuXHR9XG5cdGZvciAoY29uc3QgbiBvZiBjbGFpbWVkX25vZGVzKSB7XG5cdFx0bi5jbGFpbV9vcmRlciA9IG5vZGVzLmNsYWltX2luZm8udG90YWxfY2xhaW1lZDtcblx0XHRub2Rlcy5jbGFpbV9pbmZvLnRvdGFsX2NsYWltZWQgKz0gMTtcblx0fVxuXHRyZXR1cm4gbmV3IEh0bWxUYWdIeWRyYXRpb24oaXNfc3ZnLCBjbGFpbWVkX25vZGVzKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1RleHR9IHRleHRcbiAqIEBwYXJhbSB7dW5rbm93bn0gZGF0YVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfZGF0YSh0ZXh0LCBkYXRhKSB7XG5cdGRhdGEgPSAnJyArIGRhdGE7XG5cdGlmICh0ZXh0LmRhdGEgPT09IGRhdGEpIHJldHVybjtcblx0dGV4dC5kYXRhID0gLyoqIEB0eXBlIHtzdHJpbmd9ICovIChkYXRhKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1RleHR9IHRleHRcbiAqIEBwYXJhbSB7dW5rbm93bn0gZGF0YVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfZGF0YV9jb250ZW50ZWRpdGFibGUodGV4dCwgZGF0YSkge1xuXHRkYXRhID0gJycgKyBkYXRhO1xuXHRpZiAodGV4dC53aG9sZVRleHQgPT09IGRhdGEpIHJldHVybjtcblx0dGV4dC5kYXRhID0gLyoqIEB0eXBlIHtzdHJpbmd9ICovIChkYXRhKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1RleHR9IHRleHRcbiAqIEBwYXJhbSB7dW5rbm93bn0gZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IGF0dHJfdmFsdWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2RhdGFfbWF5YmVfY29udGVudGVkaXRhYmxlKHRleHQsIGRhdGEsIGF0dHJfdmFsdWUpIHtcblx0aWYgKH5jb250ZW50ZWRpdGFibGVfdHJ1dGh5X3ZhbHVlcy5pbmRleE9mKGF0dHJfdmFsdWUpKSB7XG5cdFx0c2V0X2RhdGFfY29udGVudGVkaXRhYmxlKHRleHQsIGRhdGEpO1xuXHR9IGVsc2Uge1xuXHRcdHNldF9kYXRhKHRleHQsIGRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2lucHV0X3ZhbHVlKGlucHV0LCB2YWx1ZSkge1xuXHRpbnB1dC52YWx1ZSA9IHZhbHVlID09IG51bGwgPyAnJyA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldF9pbnB1dF90eXBlKGlucHV0LCB0eXBlKSB7XG5cdHRyeSB7XG5cdFx0aW5wdXQudHlwZSA9IHR5cGU7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQvLyBkbyBub3RoaW5nXG5cdH1cbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfc3R5bGUobm9kZSwga2V5LCB2YWx1ZSwgaW1wb3J0YW50KSB7XG5cdGlmICh2YWx1ZSA9PSBudWxsKSB7XG5cdFx0bm9kZS5zdHlsZS5yZW1vdmVQcm9wZXJ0eShrZXkpO1xuXHR9IGVsc2Uge1xuXHRcdG5vZGUuc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZSwgaW1wb3J0YW50ID8gJ2ltcG9ydGFudCcgOiAnJyk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3Rfb3B0aW9uKHNlbGVjdCwgdmFsdWUsIG1vdW50aW5nKSB7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRjb25zdCBvcHRpb24gPSBzZWxlY3Qub3B0aW9uc1tpXTtcblx0XHRpZiAob3B0aW9uLl9fdmFsdWUgPT09IHZhbHVlKSB7XG5cdFx0XHRvcHRpb24uc2VsZWN0ZWQgPSB0cnVlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXHRpZiAoIW1vdW50aW5nIHx8IHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRzZWxlY3Quc2VsZWN0ZWRJbmRleCA9IC0xOyAvLyBubyBvcHRpb24gc2hvdWxkIGJlIHNlbGVjdGVkXG5cdH1cbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3Rfb3B0aW9ucyhzZWxlY3QsIHZhbHVlKSB7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRjb25zdCBvcHRpb24gPSBzZWxlY3Qub3B0aW9uc1tpXTtcblx0XHRvcHRpb24uc2VsZWN0ZWQgPSB+dmFsdWUuaW5kZXhPZihvcHRpb24uX192YWx1ZSk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdF92YWx1ZShzZWxlY3QpIHtcblx0Y29uc3Qgc2VsZWN0ZWRfb3B0aW9uID0gc2VsZWN0LnF1ZXJ5U2VsZWN0b3IoJzpjaGVja2VkJyk7XG5cdHJldHVybiBzZWxlY3RlZF9vcHRpb24gJiYgc2VsZWN0ZWRfb3B0aW9uLl9fdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3RfbXVsdGlwbGVfdmFsdWUoc2VsZWN0KSB7XG5cdHJldHVybiBbXS5tYXAuY2FsbChzZWxlY3QucXVlcnlTZWxlY3RvckFsbCgnOmNoZWNrZWQnKSwgKG9wdGlvbikgPT4gb3B0aW9uLl9fdmFsdWUpO1xufVxuLy8gdW5mb3J0dW5hdGVseSB0aGlzIGNhbid0IGJlIGEgY29uc3RhbnQgYXMgdGhhdCB3b3VsZG4ndCBiZSB0cmVlLXNoYWtlYWJsZVxuLy8gc28gd2UgY2FjaGUgdGhlIHJlc3VsdCBpbnN0ZWFkXG5cbi8qKlxuICogQHR5cGUge2Jvb2xlYW59ICovXG5sZXQgY3Jvc3NvcmlnaW47XG5cbi8qKlxuICogQHJldHVybnMge2Jvb2xlYW59ICovXG5leHBvcnQgZnVuY3Rpb24gaXNfY3Jvc3NvcmlnaW4oKSB7XG5cdGlmIChjcm9zc29yaWdpbiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0Y3Jvc3NvcmlnaW4gPSBmYWxzZTtcblx0XHR0cnkge1xuXHRcdFx0aWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wYXJlbnQpIHtcblx0XHRcdFx0dm9pZCB3aW5kb3cucGFyZW50LmRvY3VtZW50O1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRjcm9zc29yaWdpbiA9IHRydWU7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBjcm9zc29yaWdpbjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBub2RlXG4gKiBAcGFyYW0geygpID0+IHZvaWR9IGZuXG4gKiBAcmV0dXJucyB7KCkgPT4gdm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZF9pZnJhbWVfcmVzaXplX2xpc3RlbmVyKG5vZGUsIGZuKSB7XG5cdGNvbnN0IGNvbXB1dGVkX3N0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcblx0aWYgKGNvbXB1dGVkX3N0eWxlLnBvc2l0aW9uID09PSAnc3RhdGljJykge1xuXHRcdG5vZGUuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuXHR9XG5cdGNvbnN0IGlmcmFtZSA9IGVsZW1lbnQoJ2lmcmFtZScpO1xuXHRpZnJhbWUuc2V0QXR0cmlidXRlKFxuXHRcdCdzdHlsZScsXG5cdFx0J2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTsgJyArXG5cdFx0XHQnb3ZlcmZsb3c6IGhpZGRlbjsgYm9yZGVyOiAwOyBvcGFjaXR5OiAwOyBwb2ludGVyLWV2ZW50czogbm9uZTsgei1pbmRleDogLTE7J1xuXHQpO1xuXHRpZnJhbWUuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cdGlmcmFtZS50YWJJbmRleCA9IC0xO1xuXHRjb25zdCBjcm9zc29yaWdpbiA9IGlzX2Nyb3Nzb3JpZ2luKCk7XG5cblx0LyoqXG5cdCAqIEB0eXBlIHsoKSA9PiB2b2lkfVxuXHQgKi9cblx0bGV0IHVuc3Vic2NyaWJlO1xuXHRpZiAoY3Jvc3NvcmlnaW4pIHtcblx0XHRpZnJhbWUuc3JjID0gXCJkYXRhOnRleHQvaHRtbCw8c2NyaXB0Pm9ucmVzaXplPWZ1bmN0aW9uKCl7cGFyZW50LnBvc3RNZXNzYWdlKDAsJyonKX08L3NjcmlwdD5cIjtcblx0XHR1bnN1YnNjcmliZSA9IGxpc3Rlbihcblx0XHRcdHdpbmRvdyxcblx0XHRcdCdtZXNzYWdlJyxcblx0XHRcdC8qKiBAcGFyYW0ge01lc3NhZ2VFdmVudH0gZXZlbnQgKi8gKGV2ZW50KSA9PiB7XG5cdFx0XHRcdGlmIChldmVudC5zb3VyY2UgPT09IGlmcmFtZS5jb250ZW50V2luZG93KSBmbigpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0gZWxzZSB7XG5cdFx0aWZyYW1lLnNyYyA9ICdhYm91dDpibGFuayc7XG5cdFx0aWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcblx0XHRcdHVuc3Vic2NyaWJlID0gbGlzdGVuKGlmcmFtZS5jb250ZW50V2luZG93LCAncmVzaXplJywgZm4pO1xuXHRcdFx0Ly8gbWFrZSBzdXJlIGFuIGluaXRpYWwgcmVzaXplIGV2ZW50IGlzIGZpcmVkIF9hZnRlcl8gdGhlIGlmcmFtZSBpcyBsb2FkZWQgKHdoaWNoIGlzIGFzeW5jaHJvbm91cylcblx0XHRcdC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vc3ZlbHRlanMvc3ZlbHRlL2lzc3Vlcy80MjMzXG5cdFx0XHRmbigpO1xuXHRcdH07XG5cdH1cblx0YXBwZW5kKG5vZGUsIGlmcmFtZSk7XG5cdHJldHVybiAoKSA9PiB7XG5cdFx0aWYgKGNyb3Nzb3JpZ2luKSB7XG5cdFx0XHR1bnN1YnNjcmliZSgpO1xuXHRcdH0gZWxzZSBpZiAodW5zdWJzY3JpYmUgJiYgaWZyYW1lLmNvbnRlbnRXaW5kb3cpIHtcblx0XHRcdHVuc3Vic2NyaWJlKCk7XG5cdFx0fVxuXHRcdGRldGFjaChpZnJhbWUpO1xuXHR9O1xufVxuZXhwb3J0IGNvbnN0IHJlc2l6ZV9vYnNlcnZlcl9jb250ZW50X2JveCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgUmVzaXplT2JzZXJ2ZXJTaW5nbGV0b24oe1xuXHRib3g6ICdjb250ZW50LWJveCdcbn0pO1xuZXhwb3J0IGNvbnN0IHJlc2l6ZV9vYnNlcnZlcl9ib3JkZXJfYm94ID0gLyogQF9fUFVSRV9fICovIG5ldyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbih7XG5cdGJveDogJ2JvcmRlci1ib3gnXG59KTtcbmV4cG9ydCBjb25zdCByZXNpemVfb2JzZXJ2ZXJfZGV2aWNlX3BpeGVsX2NvbnRlbnRfYm94ID0gLyogQF9fUFVSRV9fICovIG5ldyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbihcblx0eyBib3g6ICdkZXZpY2UtcGl4ZWwtY29udGVudC1ib3gnIH1cbik7XG5leHBvcnQgeyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbiB9O1xuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvZ2dsZV9jbGFzcyhlbGVtZW50LCBuYW1lLCB0b2dnbGUpIHtcblx0Ly8gVGhlIGAhIWAgaXMgcmVxdWlyZWQgYmVjYXVzZSBhbiBgdW5kZWZpbmVkYCBmbGFnIG1lYW5zIGZsaXBwaW5nIHRoZSBjdXJyZW50IHN0YXRlLlxuXHRlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUobmFtZSwgISF0b2dnbGUpO1xufVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtUfSBbZGV0YWlsXVxuICogQHBhcmFtIHt7IGJ1YmJsZXM/OiBib29sZWFuLCBjYW5jZWxhYmxlPzogYm9vbGVhbiB9fSBbb3B0aW9uc11cbiAqIEByZXR1cm5zIHtDdXN0b21FdmVudDxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwsIHsgYnViYmxlcyA9IGZhbHNlLCBjYW5jZWxhYmxlID0gZmFsc2UgfSA9IHt9KSB7XG5cdHJldHVybiBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWwsIGJ1YmJsZXMsIGNhbmNlbGFibGUgfSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwYXJlbnRcbiAqIEByZXR1cm5zIHtDaGlsZE5vZGVBcnJheX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJ5X3NlbGVjdG9yX2FsbChzZWxlY3RvciwgcGFyZW50ID0gZG9jdW1lbnQuYm9keSkge1xuXHRyZXR1cm4gQXJyYXkuZnJvbShwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBub2RlSWRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGhlYWRcbiAqIEByZXR1cm5zIHthbnlbXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhlYWRfc2VsZWN0b3Iobm9kZUlkLCBoZWFkKSB7XG5cdGNvbnN0IHJlc3VsdCA9IFtdO1xuXHRsZXQgc3RhcnRlZCA9IDA7XG5cdGZvciAoY29uc3Qgbm9kZSBvZiBoZWFkLmNoaWxkTm9kZXMpIHtcblx0XHRpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCAvKiBjb21tZW50IG5vZGUgKi8pIHtcblx0XHRcdGNvbnN0IGNvbW1lbnQgPSBub2RlLnRleHRDb250ZW50LnRyaW0oKTtcblx0XHRcdGlmIChjb21tZW50ID09PSBgSEVBRF8ke25vZGVJZH1fRU5EYCkge1xuXHRcdFx0XHRzdGFydGVkIC09IDE7XG5cdFx0XHRcdHJlc3VsdC5wdXNoKG5vZGUpO1xuXHRcdFx0fSBlbHNlIGlmIChjb21tZW50ID09PSBgSEVBRF8ke25vZGVJZH1fU1RBUlRgKSB7XG5cdFx0XHRcdHN0YXJ0ZWQgKz0gMTtcblx0XHRcdFx0cmVzdWx0LnB1c2gobm9kZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChzdGFydGVkID4gMCkge1xuXHRcdFx0cmVzdWx0LnB1c2gobm9kZSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG4vKiogKi9cbmV4cG9ydCBjbGFzcyBIdG1sVGFnIHtcblx0LyoqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBkZWZhdWx0IGZhbHNlXG5cdCAqL1xuXHRpc19zdmcgPSBmYWxzZTtcblx0LyoqIHBhcmVudCBmb3IgY3JlYXRpbmcgbm9kZSAqL1xuXHRlID0gdW5kZWZpbmVkO1xuXHQvKiogaHRtbCB0YWcgbm9kZXMgKi9cblx0biA9IHVuZGVmaW5lZDtcblx0LyoqIHRhcmdldCAqL1xuXHR0ID0gdW5kZWZpbmVkO1xuXHQvKiogYW5jaG9yICovXG5cdGEgPSB1bmRlZmluZWQ7XG5cdGNvbnN0cnVjdG9yKGlzX3N2ZyA9IGZhbHNlKSB7XG5cdFx0dGhpcy5pc19zdmcgPSBpc19zdmc7XG5cdFx0dGhpcy5lID0gdGhpcy5uID0gbnVsbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gaHRtbFxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGMoaHRtbCkge1xuXHRcdHRoaXMuaChodG1sKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gaHRtbFxuXHQgKiBAcGFyYW0ge0hUTUxFbGVtZW50IHwgU1ZHRWxlbWVudH0gdGFyZ2V0XG5cdCAqIEBwYXJhbSB7SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50fSBhbmNob3Jcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRtKGh0bWwsIHRhcmdldCwgYW5jaG9yID0gbnVsbCkge1xuXHRcdGlmICghdGhpcy5lKSB7XG5cdFx0XHRpZiAodGhpcy5pc19zdmcpXG5cdFx0XHRcdHRoaXMuZSA9IHN2Z19lbGVtZW50KC8qKiBAdHlwZSB7a2V5b2YgU1ZHRWxlbWVudFRhZ05hbWVNYXB9ICovICh0YXJnZXQubm9kZU5hbWUpKTtcblx0XHRcdC8qKiAjNzM2NCAgdGFyZ2V0IGZvciA8dGVtcGxhdGU+IG1heSBiZSBwcm92aWRlZCBhcyAjZG9jdW1lbnQtZnJhZ21lbnQoMTEpICovIGVsc2Vcblx0XHRcdFx0dGhpcy5lID0gZWxlbWVudChcblx0XHRcdFx0XHQvKiogQHR5cGUge2tleW9mIEhUTUxFbGVtZW50VGFnTmFtZU1hcH0gKi8gKFxuXHRcdFx0XHRcdFx0dGFyZ2V0Lm5vZGVUeXBlID09PSAxMSA/ICdURU1QTEFURScgOiB0YXJnZXQubm9kZU5hbWVcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCk7XG5cdFx0XHR0aGlzLnQgPVxuXHRcdFx0XHR0YXJnZXQudGFnTmFtZSAhPT0gJ1RFTVBMQVRFJ1xuXHRcdFx0XHRcdD8gdGFyZ2V0XG5cdFx0XHRcdFx0OiAvKiogQHR5cGUge0hUTUxUZW1wbGF0ZUVsZW1lbnR9ICovICh0YXJnZXQpLmNvbnRlbnQ7XG5cdFx0XHR0aGlzLmMoaHRtbCk7XG5cdFx0fVxuXHRcdHRoaXMuaShhbmNob3IpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBodG1sXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0aChodG1sKSB7XG5cdFx0dGhpcy5lLmlubmVySFRNTCA9IGh0bWw7XG5cdFx0dGhpcy5uID0gQXJyYXkuZnJvbShcblx0XHRcdHRoaXMuZS5ub2RlTmFtZSA9PT0gJ1RFTVBMQVRFJyA/IHRoaXMuZS5jb250ZW50LmNoaWxkTm9kZXMgOiB0aGlzLmUuY2hpbGROb2Rlc1xuXHRcdCk7XG5cdH1cblxuXHQvKipcblx0ICogQHJldHVybnMge3ZvaWR9ICovXG5cdGkoYW5jaG9yKSB7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm4ubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGluc2VydCh0aGlzLnQsIHRoaXMubltpXSwgYW5jaG9yKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IGh0bWxcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRwKGh0bWwpIHtcblx0XHR0aGlzLmQoKTtcblx0XHR0aGlzLmgoaHRtbCk7XG5cdFx0dGhpcy5pKHRoaXMuYSk7XG5cdH1cblxuXHQvKipcblx0ICogQHJldHVybnMge3ZvaWR9ICovXG5cdGQoKSB7XG5cdFx0dGhpcy5uLmZvckVhY2goZGV0YWNoKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgSHRtbFRhZ0h5ZHJhdGlvbiBleHRlbmRzIEh0bWxUYWcge1xuXHQvKiogQHR5cGUge0VsZW1lbnRbXX0gaHlkcmF0aW9uIGNsYWltZWQgbm9kZXMgKi9cblx0bCA9IHVuZGVmaW5lZDtcblxuXHRjb25zdHJ1Y3Rvcihpc19zdmcgPSBmYWxzZSwgY2xhaW1lZF9ub2Rlcykge1xuXHRcdHN1cGVyKGlzX3N2Zyk7XG5cdFx0dGhpcy5lID0gdGhpcy5uID0gbnVsbDtcblx0XHR0aGlzLmwgPSBjbGFpbWVkX25vZGVzO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBodG1sXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0YyhodG1sKSB7XG5cdFx0aWYgKHRoaXMubCkge1xuXHRcdFx0dGhpcy5uID0gdGhpcy5sO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdXBlci5jKGh0bWwpO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcmV0dXJucyB7dm9pZH0gKi9cblx0aShhbmNob3IpIHtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubi5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0aW5zZXJ0X2h5ZHJhdGlvbih0aGlzLnQsIHRoaXMubltpXSwgYW5jaG9yKTtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gYXR0cmlidXRlc1xuICogQHJldHVybnMge3t9fVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXR0cmlidXRlX3RvX29iamVjdChhdHRyaWJ1dGVzKSB7XG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xuXHRmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiBhdHRyaWJ1dGVzKSB7XG5cdFx0cmVzdWx0W2F0dHJpYnV0ZS5uYW1lXSA9IGF0dHJpYnV0ZS52YWx1ZTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCBlc2NhcGVkID0ge1xuXHQnXCInOiAnJnF1b3Q7Jyxcblx0JyYnOiAnJmFtcDsnLFxuXHQnPCc6ICcmbHQ7J1xufTtcblxuY29uc3QgcmVnZXhfYXR0cmlidXRlX2NoYXJhY3RlcnNfdG9fZXNjYXBlID0gL1tcIiY8XS9nO1xuXG4vKipcbiAqIE5vdGUgdGhhdCB0aGUgYXR0cmlidXRlIGl0c2VsZiBzaG91bGQgYmUgc3Vycm91bmRlZCBpbiBkb3VibGUgcXVvdGVzXG4gKiBAcGFyYW0ge2FueX0gYXR0cmlidXRlXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZV9hdHRyaWJ1dGUoYXR0cmlidXRlKSB7XG5cdHJldHVybiBTdHJpbmcoYXR0cmlidXRlKS5yZXBsYWNlKHJlZ2V4X2F0dHJpYnV0ZV9jaGFyYWN0ZXJzX3RvX2VzY2FwZSwgKG1hdGNoKSA9PiBlc2NhcGVkW21hdGNoXSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+fSBhdHRyaWJ1dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlfc3ByZWFkKGF0dHJpYnV0ZXMpIHtcblx0bGV0IHN0ciA9ICcgJztcblx0Zm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuXHRcdGlmIChhdHRyaWJ1dGVzW2tleV0gIT0gbnVsbCkge1xuXHRcdFx0c3RyICs9IGAke2tleX09XCIke2VzY2FwZV9hdHRyaWJ1dGUoYXR0cmlidXRlc1trZXldKX1cIiBgO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdHI7XG59XG5cbi8qKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge3t9fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X2N1c3RvbV9lbGVtZW50c19zbG90cyhlbGVtZW50KSB7XG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xuXHRlbGVtZW50LmNoaWxkTm9kZXMuZm9yRWFjaChcblx0XHQvKiogQHBhcmFtIHtFbGVtZW50fSBub2RlICovIChub2RlKSA9PiB7XG5cdFx0XHRyZXN1bHRbbm9kZS5zbG90IHx8ICdkZWZhdWx0J10gPSB0cnVlO1xuXHRcdH1cblx0KTtcblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnN0cnVjdF9zdmVsdGVfY29tcG9uZW50KGNvbXBvbmVudCwgcHJvcHMpIHtcblx0cmV0dXJuIG5ldyBjb21wb25lbnQocHJvcHMpO1xufVxuXG4vKipcbiAqIEB0eXBlZGVmIHtOb2RlICYge1xuICogXHRjbGFpbV9vcmRlcj86IG51bWJlcjtcbiAqIFx0aHlkcmF0ZV9pbml0PzogdHJ1ZTtcbiAqIFx0YWN0dWFsX2VuZF9jaGlsZD86IE5vZGVFeDtcbiAqIFx0Y2hpbGROb2RlczogTm9kZUxpc3RPZjxOb2RlRXg+O1xuICogfX0gTm9kZUV4XG4gKi9cblxuLyoqIEB0eXBlZGVmIHtDaGlsZE5vZGUgJiBOb2RlRXh9IENoaWxkTm9kZUV4ICovXG5cbi8qKiBAdHlwZWRlZiB7Tm9kZUV4ICYgeyBjbGFpbV9vcmRlcjogbnVtYmVyIH19IE5vZGVFeDIgKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7Q2hpbGROb2RlRXhbXSAmIHtcbiAqIFx0Y2xhaW1faW5mbz86IHtcbiAqIFx0XHRsYXN0X2luZGV4OiBudW1iZXI7XG4gKiBcdFx0dG90YWxfY2xhaW1lZDogbnVtYmVyO1xuICogXHR9O1xuICogfX0gQ2hpbGROb2RlQXJyYXlcbiAqL1xuIiwiaW1wb3J0IHsgY3VzdG9tX2V2ZW50IH0gZnJvbSAnLi9kb20uanMnO1xuXG5leHBvcnQgbGV0IGN1cnJlbnRfY29tcG9uZW50O1xuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2N1cnJlbnRfY29tcG9uZW50KGNvbXBvbmVudCkge1xuXHRjdXJyZW50X2NvbXBvbmVudCA9IGNvbXBvbmVudDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF9jdXJyZW50X2NvbXBvbmVudCgpIHtcblx0aWYgKCFjdXJyZW50X2NvbXBvbmVudCkgdGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbiBjYWxsZWQgb3V0c2lkZSBjb21wb25lbnQgaW5pdGlhbGl6YXRpb24nKTtcblx0cmV0dXJuIGN1cnJlbnRfY29tcG9uZW50O1xufVxuXG4vKipcbiAqIFNjaGVkdWxlcyBhIGNhbGxiYWNrIHRvIHJ1biBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyB1cGRhdGVkIGFmdGVyIGFueSBzdGF0ZSBjaGFuZ2UuXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIHJ1bnMgd2lsbCBiZSBiZWZvcmUgdGhlIGluaXRpYWwgYG9uTW91bnRgXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2JlZm9yZXVwZGF0ZVxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuXHRnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5iZWZvcmVfdXBkYXRlLnB1c2goZm4pO1xufVxuXG4vKipcbiAqIFRoZSBgb25Nb3VudGAgZnVuY3Rpb24gc2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGFzIHNvb24gYXMgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiBtb3VudGVkIHRvIHRoZSBET00uXG4gKiBJdCBtdXN0IGJlIGNhbGxlZCBkdXJpbmcgdGhlIGNvbXBvbmVudCdzIGluaXRpYWxpc2F0aW9uIChidXQgZG9lc24ndCBuZWVkIHRvIGxpdmUgKmluc2lkZSogdGhlIGNvbXBvbmVudDtcbiAqIGl0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbiBleHRlcm5hbCBtb2R1bGUpLlxuICpcbiAqIElmIGEgZnVuY3Rpb24gaXMgcmV0dXJuZWQgX3N5bmNocm9ub3VzbHlfIGZyb20gYG9uTW91bnRgLCBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIGBvbk1vdW50YCBkb2VzIG5vdCBydW4gaW5zaWRlIGEgW3NlcnZlci1zaWRlIGNvbXBvbmVudF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3MjcnVuLXRpbWUtc2VydmVyLXNpZGUtY29tcG9uZW50LWFwaSkuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI29ubW91bnRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0geygpID0+IGltcG9ydCgnLi9wcml2YXRlLmpzJykuTm90RnVuY3Rpb248VD4gfCBQcm9taXNlPGltcG9ydCgnLi9wcml2YXRlLmpzJykuTm90RnVuY3Rpb248VD4+IHwgKCgpID0+IGFueSl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcblx0Z2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQub25fbW91bnQucHVzaChmbik7XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdXBkYXRlZC5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGFmdGVyIHRoZSBpbml0aWFsIGBvbk1vdW50YFxuICpcbiAqIGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZSNhZnRlcnVwZGF0ZVxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFmdGVyVXBkYXRlKGZuKSB7XG5cdGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmFmdGVyX3VwZGF0ZS5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBTY2hlZHVsZXMgYSBjYWxsYmFjayB0byBydW4gaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIE91dCBvZiBgb25Nb3VudGAsIGBiZWZvcmVVcGRhdGVgLCBgYWZ0ZXJVcGRhdGVgIGFuZCBgb25EZXN0cm95YCwgdGhpcyBpcyB0aGVcbiAqIG9ubHkgb25lIHRoYXQgcnVucyBpbnNpZGUgYSBzZXJ2ZXItc2lkZSBjb21wb25lbnQuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI29uZGVzdHJveVxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uRGVzdHJveShmbikge1xuXHRnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5vbl9kZXN0cm95LnB1c2goZm4pO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gZXZlbnQgZGlzcGF0Y2hlciB0aGF0IGNhbiBiZSB1c2VkIHRvIGRpc3BhdGNoIFtjb21wb25lbnQgZXZlbnRzXShodHRwczovL3N2ZWx0ZS5kZXYvZG9jcyN0ZW1wbGF0ZS1zeW50YXgtY29tcG9uZW50LWRpcmVjdGl2ZXMtb24tZXZlbnRuYW1lKS5cbiAqIEV2ZW50IGRpc3BhdGNoZXJzIGFyZSBmdW5jdGlvbnMgdGhhdCBjYW4gdGFrZSB0d28gYXJndW1lbnRzOiBgbmFtZWAgYW5kIGBkZXRhaWxgLlxuICpcbiAqIENvbXBvbmVudCBldmVudHMgY3JlYXRlZCB3aXRoIGBjcmVhdGVFdmVudERpc3BhdGNoZXJgIGNyZWF0ZSBhXG4gKiBbQ3VzdG9tRXZlbnRdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudCkuXG4gKiBUaGVzZSBldmVudHMgZG8gbm90IFtidWJibGVdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvTGVhcm4vSmF2YVNjcmlwdC9CdWlsZGluZ19ibG9ja3MvRXZlbnRzI0V2ZW50X2J1YmJsaW5nX2FuZF9jYXB0dXJlKS5cbiAqIFRoZSBgZGV0YWlsYCBhcmd1bWVudCBjb3JyZXNwb25kcyB0byB0aGUgW0N1c3RvbUV2ZW50LmRldGFpbF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0N1c3RvbUV2ZW50L2RldGFpbClcbiAqIHByb3BlcnR5IGFuZCBjYW4gY29udGFpbiBhbnkgdHlwZSBvZiBkYXRhLlxuICpcbiAqIFRoZSBldmVudCBkaXNwYXRjaGVyIGNhbiBiZSB0eXBlZCB0byBuYXJyb3cgdGhlIGFsbG93ZWQgZXZlbnQgbmFtZXMgYW5kIHRoZSB0eXBlIG9mIHRoZSBgZGV0YWlsYCBhcmd1bWVudDpcbiAqIGBgYHRzXG4gKiBjb25zdCBkaXNwYXRjaCA9IGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcjx7XG4gKiAgbG9hZGVkOiBuZXZlcjsgLy8gZG9lcyBub3QgdGFrZSBhIGRldGFpbCBhcmd1bWVudFxuICogIGNoYW5nZTogc3RyaW5nOyAvLyB0YWtlcyBhIGRldGFpbCBhcmd1bWVudCBvZiB0eXBlIHN0cmluZywgd2hpY2ggaXMgcmVxdWlyZWRcbiAqICBvcHRpb25hbDogbnVtYmVyIHwgbnVsbDsgLy8gdGFrZXMgYW4gb3B0aW9uYWwgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgbnVtYmVyXG4gKiB9PigpO1xuICogYGBgXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2NyZWF0ZWV2ZW50ZGlzcGF0Y2hlclxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRNYXA9YW55XVxuICogQHJldHVybnMge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5FdmVudERpc3BhdGNoZXI8RXZlbnRNYXA+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCkge1xuXHRjb25zdCBjb21wb25lbnQgPSBnZXRfY3VycmVudF9jb21wb25lbnQoKTtcblx0cmV0dXJuICh0eXBlLCBkZXRhaWwsIHsgY2FuY2VsYWJsZSA9IGZhbHNlIH0gPSB7fSkgPT4ge1xuXHRcdGNvbnN0IGNhbGxiYWNrcyA9IGNvbXBvbmVudC4kJC5jYWxsYmFja3NbdHlwZV07XG5cdFx0aWYgKGNhbGxiYWNrcykge1xuXHRcdFx0Ly8gVE9ETyBhcmUgdGhlcmUgc2l0dWF0aW9ucyB3aGVyZSBldmVudHMgY291bGQgYmUgZGlzcGF0Y2hlZFxuXHRcdFx0Ly8gaW4gYSBzZXJ2ZXIgKG5vbi1ET00pIGVudmlyb25tZW50P1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBjdXN0b21fZXZlbnQoLyoqIEB0eXBlIHtzdHJpbmd9ICovICh0eXBlKSwgZGV0YWlsLCB7IGNhbmNlbGFibGUgfSk7XG5cdFx0XHRjYWxsYmFja3Muc2xpY2UoKS5mb3JFYWNoKChmbikgPT4ge1xuXHRcdFx0XHRmbi5jYWxsKGNvbXBvbmVudCwgZXZlbnQpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gIWV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQ7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xufVxuXG4vKipcbiAqIEFzc29jaWF0ZXMgYW4gYXJiaXRyYXJ5IGBjb250ZXh0YCBvYmplY3Qgd2l0aCB0aGUgY3VycmVudCBjb21wb25lbnQgYW5kIHRoZSBzcGVjaWZpZWQgYGtleWBcbiAqIGFuZCByZXR1cm5zIHRoYXQgb2JqZWN0LiBUaGUgY29udGV4dCBpcyB0aGVuIGF2YWlsYWJsZSB0byBjaGlsZHJlbiBvZiB0aGUgY29tcG9uZW50XG4gKiAoaW5jbHVkaW5nIHNsb3R0ZWQgY29udGVudCkgd2l0aCBgZ2V0Q29udGV4dGAuXG4gKlxuICogTGlrZSBsaWZlY3ljbGUgZnVuY3Rpb25zLCB0aGlzIG11c3QgYmUgY2FsbGVkIGR1cmluZyBjb21wb25lbnQgaW5pdGlhbGlzYXRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI3NldGNvbnRleHRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge2FueX0ga2V5XG4gKiBAcGFyYW0ge1R9IGNvbnRleHRcbiAqIEByZXR1cm5zIHtUfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q29udGV4dChrZXksIGNvbnRleHQpIHtcblx0Z2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuY29udGV4dC5zZXQoa2V5LCBjb250ZXh0KTtcblx0cmV0dXJuIGNvbnRleHQ7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBjb250ZXh0IHRoYXQgYmVsb25ncyB0byB0aGUgY2xvc2VzdCBwYXJlbnQgY29tcG9uZW50IHdpdGggdGhlIHNwZWNpZmllZCBga2V5YC5cbiAqIE11c3QgYmUgY2FsbGVkIGR1cmluZyBjb21wb25lbnQgaW5pdGlhbGlzYXRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2dldGNvbnRleHRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge2FueX0ga2V5XG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRleHQoa2V5KSB7XG5cdHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmdldChrZXkpO1xufVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgd2hvbGUgY29udGV4dCBtYXAgdGhhdCBiZWxvbmdzIHRvIHRoZSBjbG9zZXN0IHBhcmVudCBjb21wb25lbnQuXG4gKiBNdXN0IGJlIGNhbGxlZCBkdXJpbmcgY29tcG9uZW50IGluaXRpYWxpc2F0aW9uLiBVc2VmdWwsIGZvciBleGFtcGxlLCBpZiB5b3VcbiAqIHByb2dyYW1tYXRpY2FsbHkgY3JlYXRlIGEgY29tcG9uZW50IGFuZCB3YW50IHRvIHBhc3MgdGhlIGV4aXN0aW5nIGNvbnRleHQgdG8gaXQuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2dldGFsbGNvbnRleHRzXG4gKiBAdGVtcGxhdGUge01hcDxhbnksIGFueT59IFtUPU1hcDxhbnksIGFueT5dXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbENvbnRleHRzKCkge1xuXHRyZXR1cm4gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuY29udGV4dDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIGBrZXlgIGhhcyBiZWVuIHNldCBpbiB0aGUgY29udGV4dCBvZiBhIHBhcmVudCBjb21wb25lbnQuXG4gKiBNdXN0IGJlIGNhbGxlZCBkdXJpbmcgY29tcG9uZW50IGluaXRpYWxpc2F0aW9uLlxuICpcbiAqIGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZSNoYXNjb250ZXh0XG4gKiBAcGFyYW0ge2FueX0ga2V5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0NvbnRleHQoa2V5KSB7XG5cdHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmhhcyhrZXkpO1xufVxuXG4vLyBUT0RPIGZpZ3VyZSBvdXQgaWYgd2Ugc3RpbGwgd2FudCB0byBzdXBwb3J0XG4vLyBzaG9ydGhhbmQgZXZlbnRzLCBvciBpZiB3ZSB3YW50IHRvIGltcGxlbWVudFxuLy8gYSByZWFsIGJ1YmJsaW5nIG1lY2hhbmlzbVxuLyoqXG4gKiBAcGFyYW0gY29tcG9uZW50XG4gKiBAcGFyYW0gZXZlbnRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYnViYmxlKGNvbXBvbmVudCwgZXZlbnQpIHtcblx0Y29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1tldmVudC50eXBlXTtcblx0aWYgKGNhbGxiYWNrcykge1xuXHRcdC8vIEB0cy1pZ25vcmVcblx0XHRjYWxsYmFja3Muc2xpY2UoKS5mb3JFYWNoKChmbikgPT4gZm4uY2FsbCh0aGlzLCBldmVudCkpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBydW5fYWxsIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgeyBjdXJyZW50X2NvbXBvbmVudCwgc2V0X2N1cnJlbnRfY29tcG9uZW50IH0gZnJvbSAnLi9saWZlY3ljbGUuanMnO1xuXG5leHBvcnQgY29uc3QgZGlydHlfY29tcG9uZW50cyA9IFtdO1xuZXhwb3J0IGNvbnN0IGludHJvcyA9IHsgZW5hYmxlZDogZmFsc2UgfTtcbmV4cG9ydCBjb25zdCBiaW5kaW5nX2NhbGxiYWNrcyA9IFtdO1xuXG5sZXQgcmVuZGVyX2NhbGxiYWNrcyA9IFtdO1xuXG5jb25zdCBmbHVzaF9jYWxsYmFja3MgPSBbXTtcblxuY29uc3QgcmVzb2x2ZWRfcHJvbWlzZSA9IC8qIEBfX1BVUkVfXyAqLyBQcm9taXNlLnJlc29sdmUoKTtcblxubGV0IHVwZGF0ZV9zY2hlZHVsZWQgPSBmYWxzZTtcblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjaGVkdWxlX3VwZGF0ZSgpIHtcblx0aWYgKCF1cGRhdGVfc2NoZWR1bGVkKSB7XG5cdFx0dXBkYXRlX3NjaGVkdWxlZCA9IHRydWU7XG5cdFx0cmVzb2x2ZWRfcHJvbWlzZS50aGVuKGZsdXNoKTtcblx0fVxufVxuXG4vKiogQHJldHVybnMge1Byb21pc2U8dm9pZD59ICovXG5leHBvcnQgZnVuY3Rpb24gdGljaygpIHtcblx0c2NoZWR1bGVfdXBkYXRlKCk7XG5cdHJldHVybiByZXNvbHZlZF9wcm9taXNlO1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gYWRkX3JlbmRlcl9jYWxsYmFjayhmbikge1xuXHRyZW5kZXJfY2FsbGJhY2tzLnB1c2goZm4pO1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gYWRkX2ZsdXNoX2NhbGxiYWNrKGZuKSB7XG5cdGZsdXNoX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cblxuLy8gZmx1c2goKSBjYWxscyBjYWxsYmFja3MgaW4gdGhpcyBvcmRlcjpcbi8vIDEuIEFsbCBiZWZvcmVVcGRhdGUgY2FsbGJhY2tzLCBpbiBvcmRlcjogcGFyZW50cyBiZWZvcmUgY2hpbGRyZW5cbi8vIDIuIEFsbCBiaW5kOnRoaXMgY2FsbGJhY2tzLCBpbiByZXZlcnNlIG9yZGVyOiBjaGlsZHJlbiBiZWZvcmUgcGFyZW50cy5cbi8vIDMuIEFsbCBhZnRlclVwZGF0ZSBjYWxsYmFja3MsIGluIG9yZGVyOiBwYXJlbnRzIGJlZm9yZSBjaGlsZHJlbi4gRVhDRVBUXG4vLyAgICBmb3IgYWZ0ZXJVcGRhdGVzIGNhbGxlZCBkdXJpbmcgdGhlIGluaXRpYWwgb25Nb3VudCwgd2hpY2ggYXJlIGNhbGxlZCBpblxuLy8gICAgcmV2ZXJzZSBvcmRlcjogY2hpbGRyZW4gYmVmb3JlIHBhcmVudHMuXG4vLyBTaW5jZSBjYWxsYmFja3MgbWlnaHQgdXBkYXRlIGNvbXBvbmVudCB2YWx1ZXMsIHdoaWNoIGNvdWxkIHRyaWdnZXIgYW5vdGhlclxuLy8gY2FsbCB0byBmbHVzaCgpLCB0aGUgZm9sbG93aW5nIHN0ZXBzIGd1YXJkIGFnYWluc3QgdGhpczpcbi8vIDEuIER1cmluZyBiZWZvcmVVcGRhdGUsIGFueSB1cGRhdGVkIGNvbXBvbmVudHMgd2lsbCBiZSBhZGRlZCB0byB0aGVcbi8vICAgIGRpcnR5X2NvbXBvbmVudHMgYXJyYXkgYW5kIHdpbGwgY2F1c2UgYSByZWVudHJhbnQgY2FsbCB0byBmbHVzaCgpLiBCZWNhdXNlXG4vLyAgICB0aGUgZmx1c2ggaW5kZXggaXMga2VwdCBvdXRzaWRlIHRoZSBmdW5jdGlvbiwgdGhlIHJlZW50cmFudCBjYWxsIHdpbGwgcGlja1xuLy8gICAgdXAgd2hlcmUgdGhlIGVhcmxpZXIgY2FsbCBsZWZ0IG9mZiBhbmQgZ28gdGhyb3VnaCBhbGwgZGlydHkgY29tcG9uZW50cy4gVGhlXG4vLyAgICBjdXJyZW50X2NvbXBvbmVudCB2YWx1ZSBpcyBzYXZlZCBhbmQgcmVzdG9yZWQgc28gdGhhdCB0aGUgcmVlbnRyYW50IGNhbGwgd2lsbFxuLy8gICAgbm90IGludGVyZmVyZSB3aXRoIHRoZSBcInBhcmVudFwiIGZsdXNoKCkgY2FsbC5cbi8vIDIuIGJpbmQ6dGhpcyBjYWxsYmFja3MgY2Fubm90IHRyaWdnZXIgbmV3IGZsdXNoKCkgY2FsbHMuXG4vLyAzLiBEdXJpbmcgYWZ0ZXJVcGRhdGUsIGFueSB1cGRhdGVkIGNvbXBvbmVudHMgd2lsbCBOT1QgaGF2ZSB0aGVpciBhZnRlclVwZGF0ZVxuLy8gICAgY2FsbGJhY2sgY2FsbGVkIGEgc2Vjb25kIHRpbWU7IHRoZSBzZWVuX2NhbGxiYWNrcyBzZXQsIG91dHNpZGUgdGhlIGZsdXNoKClcbi8vICAgIGZ1bmN0aW9uLCBndWFyYW50ZWVzIHRoaXMgYmVoYXZpb3IuXG5jb25zdCBzZWVuX2NhbGxiYWNrcyA9IG5ldyBTZXQoKTtcblxubGV0IGZsdXNoaWR4ID0gMDsgLy8gRG8gKm5vdCogbW92ZSB0aGlzIGluc2lkZSB0aGUgZmx1c2goKSBmdW5jdGlvblxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gZmx1c2goKSB7XG5cdC8vIERvIG5vdCByZWVudGVyIGZsdXNoIHdoaWxlIGRpcnR5IGNvbXBvbmVudHMgYXJlIHVwZGF0ZWQsIGFzIHRoaXMgY2FuXG5cdC8vIHJlc3VsdCBpbiBhbiBpbmZpbml0ZSBsb29wLiBJbnN0ZWFkLCBsZXQgdGhlIGlubmVyIGZsdXNoIGhhbmRsZSBpdC5cblx0Ly8gUmVlbnRyYW5jeSBpcyBvayBhZnRlcndhcmRzIGZvciBiaW5kaW5ncyBldGMuXG5cdGlmIChmbHVzaGlkeCAhPT0gMCkge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCBzYXZlZF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcblx0ZG8ge1xuXHRcdC8vIGZpcnN0LCBjYWxsIGJlZm9yZVVwZGF0ZSBmdW5jdGlvbnNcblx0XHQvLyBhbmQgdXBkYXRlIGNvbXBvbmVudHNcblx0XHR0cnkge1xuXHRcdFx0d2hpbGUgKGZsdXNoaWR4IDwgZGlydHlfY29tcG9uZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0Y29uc3QgY29tcG9uZW50ID0gZGlydHlfY29tcG9uZW50c1tmbHVzaGlkeF07XG5cdFx0XHRcdGZsdXNoaWR4Kys7XG5cdFx0XHRcdHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpO1xuXHRcdFx0XHR1cGRhdGUoY29tcG9uZW50LiQkKTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvLyByZXNldCBkaXJ0eSBzdGF0ZSB0byBub3QgZW5kIHVwIGluIGEgZGVhZGxvY2tlZCBzdGF0ZSBhbmQgdGhlbiByZXRocm93XG5cdFx0XHRkaXJ0eV9jb21wb25lbnRzLmxlbmd0aCA9IDA7XG5cdFx0XHRmbHVzaGlkeCA9IDA7XG5cdFx0XHR0aHJvdyBlO1xuXHRcdH1cblx0XHRzZXRfY3VycmVudF9jb21wb25lbnQobnVsbCk7XG5cdFx0ZGlydHlfY29tcG9uZW50cy5sZW5ndGggPSAwO1xuXHRcdGZsdXNoaWR4ID0gMDtcblx0XHR3aGlsZSAoYmluZGluZ19jYWxsYmFja3MubGVuZ3RoKSBiaW5kaW5nX2NhbGxiYWNrcy5wb3AoKSgpO1xuXHRcdC8vIHRoZW4sIG9uY2UgY29tcG9uZW50cyBhcmUgdXBkYXRlZCwgY2FsbFxuXHRcdC8vIGFmdGVyVXBkYXRlIGZ1bmN0aW9ucy4gVGhpcyBtYXkgY2F1c2Vcblx0XHQvLyBzdWJzZXF1ZW50IHVwZGF0ZXMuLi5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcl9jYWxsYmFja3MubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGNvbnN0IGNhbGxiYWNrID0gcmVuZGVyX2NhbGxiYWNrc1tpXTtcblx0XHRcdGlmICghc2Vlbl9jYWxsYmFja3MuaGFzKGNhbGxiYWNrKSkge1xuXHRcdFx0XHQvLyAuLi5zbyBndWFyZCBhZ2FpbnN0IGluZmluaXRlIGxvb3BzXG5cdFx0XHRcdHNlZW5fY2FsbGJhY2tzLmFkZChjYWxsYmFjayk7XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJlbmRlcl9jYWxsYmFja3MubGVuZ3RoID0gMDtcblx0fSB3aGlsZSAoZGlydHlfY29tcG9uZW50cy5sZW5ndGgpO1xuXHR3aGlsZSAoZmx1c2hfY2FsbGJhY2tzLmxlbmd0aCkge1xuXHRcdGZsdXNoX2NhbGxiYWNrcy5wb3AoKSgpO1xuXHR9XG5cdHVwZGF0ZV9zY2hlZHVsZWQgPSBmYWxzZTtcblx0c2Vlbl9jYWxsYmFja3MuY2xlYXIoKTtcblx0c2V0X2N1cnJlbnRfY29tcG9uZW50KHNhdmVkX2NvbXBvbmVudCk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmZ1bmN0aW9uIHVwZGF0ZSgkJCkge1xuXHRpZiAoJCQuZnJhZ21lbnQgIT09IG51bGwpIHtcblx0XHQkJC51cGRhdGUoKTtcblx0XHRydW5fYWxsKCQkLmJlZm9yZV91cGRhdGUpO1xuXHRcdGNvbnN0IGRpcnR5ID0gJCQuZGlydHk7XG5cdFx0JCQuZGlydHkgPSBbLTFdO1xuXHRcdCQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50LnAoJCQuY3R4LCBkaXJ0eSk7XG5cdFx0JCQuYWZ0ZXJfdXBkYXRlLmZvckVhY2goYWRkX3JlbmRlcl9jYWxsYmFjayk7XG5cdH1cbn1cblxuLyoqXG4gKiBVc2VmdWwgZm9yIGV4YW1wbGUgdG8gZXhlY3V0ZSByZW1haW5pbmcgYGFmdGVyVXBkYXRlYCBjYWxsYmFja3MgYmVmb3JlIGV4ZWN1dGluZyBgZGVzdHJveWAuXG4gKiBAcGFyYW0ge0Z1bmN0aW9uW119IGZuc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbHVzaF9yZW5kZXJfY2FsbGJhY2tzKGZucykge1xuXHRjb25zdCBmaWx0ZXJlZCA9IFtdO1xuXHRjb25zdCB0YXJnZXRzID0gW107XG5cdHJlbmRlcl9jYWxsYmFja3MuZm9yRWFjaCgoYykgPT4gKGZucy5pbmRleE9mKGMpID09PSAtMSA/IGZpbHRlcmVkLnB1c2goYykgOiB0YXJnZXRzLnB1c2goYykpKTtcblx0dGFyZ2V0cy5mb3JFYWNoKChjKSA9PiBjKCkpO1xuXHRyZW5kZXJfY2FsbGJhY2tzID0gZmlsdGVyZWQ7XG59XG4iLCJpbXBvcnQgeyBpZGVudGl0eSBhcyBsaW5lYXIsIGlzX2Z1bmN0aW9uLCBub29wLCBydW5fYWxsIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgeyBub3cgfSBmcm9tICcuL2Vudmlyb25tZW50LmpzJztcbmltcG9ydCB7IGxvb3AgfSBmcm9tICcuL2xvb3AuanMnO1xuaW1wb3J0IHsgY3JlYXRlX3J1bGUsIGRlbGV0ZV9ydWxlIH0gZnJvbSAnLi9zdHlsZV9tYW5hZ2VyLmpzJztcbmltcG9ydCB7IGN1c3RvbV9ldmVudCB9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7IGFkZF9yZW5kZXJfY2FsbGJhY2sgfSBmcm9tICcuL3NjaGVkdWxlci5qcyc7XG5cbi8qKlxuICogQHR5cGUge1Byb21pc2U8dm9pZD4gfCBudWxsfVxuICovXG5sZXQgcHJvbWlzZTtcblxuLyoqXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cbiAqL1xuZnVuY3Rpb24gd2FpdCgpIHtcblx0aWYgKCFwcm9taXNlKSB7XG5cdFx0cHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdHByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRwcm9taXNlID0gbnVsbDtcblx0XHR9KTtcblx0fVxuXHRyZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IG5vZGVcbiAqIEBwYXJhbSB7SU5UUk8gfCBPVVRSTyB8IGJvb2xlYW59IGRpcmVjdGlvblxuICogQHBhcmFtIHsnc3RhcnQnIHwgJ2VuZCd9IGtpbmRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5mdW5jdGlvbiBkaXNwYXRjaChub2RlLCBkaXJlY3Rpb24sIGtpbmQpIHtcblx0bm9kZS5kaXNwYXRjaEV2ZW50KGN1c3RvbV9ldmVudChgJHtkaXJlY3Rpb24gPyAnaW50cm8nIDogJ291dHJvJ30ke2tpbmR9YCkpO1xufVxuXG5jb25zdCBvdXRyb2luZyA9IG5ldyBTZXQoKTtcblxuLyoqXG4gKiBAdHlwZSB7T3V0cm99XG4gKi9cbmxldCBvdXRyb3M7XG5cbi8qKlxuICogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBfb3V0cm9zKCkge1xuXHRvdXRyb3MgPSB7XG5cdFx0cjogMCxcblx0XHRjOiBbXSxcblx0XHRwOiBvdXRyb3MgLy8gcGFyZW50IGdyb3VwXG5cdH07XG59XG5cbi8qKlxuICogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tfb3V0cm9zKCkge1xuXHRpZiAoIW91dHJvcy5yKSB7XG5cdFx0cnVuX2FsbChvdXRyb3MuYyk7XG5cdH1cblx0b3V0cm9zID0gb3V0cm9zLnA7XG59XG5cbi8qKlxuICogQHBhcmFtIHtpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLkZyYWdtZW50fSBibG9ja1xuICogQHBhcmFtIHswIHwgMX0gW2xvY2FsXVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2l0aW9uX2luKGJsb2NrLCBsb2NhbCkge1xuXHRpZiAoYmxvY2sgJiYgYmxvY2suaSkge1xuXHRcdG91dHJvaW5nLmRlbGV0ZShibG9jayk7XG5cdFx0YmxvY2suaShsb2NhbCk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuRnJhZ21lbnR9IGJsb2NrXG4gKiBAcGFyYW0gezAgfCAxfSBsb2NhbFxuICogQHBhcmFtIHswIHwgMX0gW2RldGFjaF1cbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gW2NhbGxiYWNrXVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2l0aW9uX291dChibG9jaywgbG9jYWwsIGRldGFjaCwgY2FsbGJhY2spIHtcblx0aWYgKGJsb2NrICYmIGJsb2NrLm8pIHtcblx0XHRpZiAob3V0cm9pbmcuaGFzKGJsb2NrKSkgcmV0dXJuO1xuXHRcdG91dHJvaW5nLmFkZChibG9jayk7XG5cdFx0b3V0cm9zLmMucHVzaCgoKSA9PiB7XG5cdFx0XHRvdXRyb2luZy5kZWxldGUoYmxvY2spO1xuXHRcdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmIChkZXRhY2gpIGJsb2NrLmQoMSk7XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0YmxvY2subyhsb2NhbCk7XG5cdH0gZWxzZSBpZiAoY2FsbGJhY2spIHtcblx0XHRjYWxsYmFjaygpO1xuXHR9XG59XG5cbi8qKlxuICogQHR5cGUge2ltcG9ydCgnLi4vdHJhbnNpdGlvbi9wdWJsaWMuanMnKS5UcmFuc2l0aW9uQ29uZmlnfVxuICovXG5jb25zdCBudWxsX3RyYW5zaXRpb24gPSB7IGR1cmF0aW9uOiAwIH07XG5cbi8qKlxuICogQHBhcmFtIHtFbGVtZW50ICYgRWxlbWVudENTU0lubGluZVN0eWxlfSBub2RlXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25Gbn0gZm5cbiAqIEBwYXJhbSB7YW55fSBwYXJhbXNcbiAqIEByZXR1cm5zIHt7IHN0YXJ0KCk6IHZvaWQ7IGludmFsaWRhdGUoKTogdm9pZDsgZW5kKCk6IHZvaWQ7IH19XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVfaW5fdHJhbnNpdGlvbihub2RlLCBmbiwgcGFyYW1zKSB7XG5cdC8qKlxuXHQgKiBAdHlwZSB7VHJhbnNpdGlvbk9wdGlvbnN9ICovXG5cdGNvbnN0IG9wdGlvbnMgPSB7IGRpcmVjdGlvbjogJ2luJyB9O1xuXHRsZXQgY29uZmlnID0gZm4obm9kZSwgcGFyYW1zLCBvcHRpb25zKTtcblx0bGV0IHJ1bm5pbmcgPSBmYWxzZTtcblx0bGV0IGFuaW1hdGlvbl9uYW1lO1xuXHRsZXQgdGFzaztcblx0bGV0IHVpZCA9IDA7XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBjbGVhbnVwKCkge1xuXHRcdGlmIChhbmltYXRpb25fbmFtZSkgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBnbygpIHtcblx0XHRjb25zdCB7XG5cdFx0XHRkZWxheSA9IDAsXG5cdFx0XHRkdXJhdGlvbiA9IDMwMCxcblx0XHRcdGVhc2luZyA9IGxpbmVhcixcblx0XHRcdHRpY2sgPSBub29wLFxuXHRcdFx0Y3NzXG5cdFx0fSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG5cdFx0aWYgKGNzcykgYW5pbWF0aW9uX25hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzLCB1aWQrKyk7XG5cdFx0dGljaygwLCAxKTtcblx0XHRjb25zdCBzdGFydF90aW1lID0gbm93KCkgKyBkZWxheTtcblx0XHRjb25zdCBlbmRfdGltZSA9IHN0YXJ0X3RpbWUgKyBkdXJhdGlvbjtcblx0XHRpZiAodGFzaykgdGFzay5hYm9ydCgpO1xuXHRcdHJ1bm5pbmcgPSB0cnVlO1xuXHRcdGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgdHJ1ZSwgJ3N0YXJ0JykpO1xuXHRcdHRhc2sgPSBsb29wKChub3cpID0+IHtcblx0XHRcdGlmIChydW5uaW5nKSB7XG5cdFx0XHRcdGlmIChub3cgPj0gZW5kX3RpbWUpIHtcblx0XHRcdFx0XHR0aWNrKDEsIDApO1xuXHRcdFx0XHRcdGRpc3BhdGNoKG5vZGUsIHRydWUsICdlbmQnKTtcblx0XHRcdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHRcdFx0cmV0dXJuIChydW5uaW5nID0gZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChub3cgPj0gc3RhcnRfdGltZSkge1xuXHRcdFx0XHRcdGNvbnN0IHQgPSBlYXNpbmcoKG5vdyAtIHN0YXJ0X3RpbWUpIC8gZHVyYXRpb24pO1xuXHRcdFx0XHRcdHRpY2sodCwgMSAtIHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcnVubmluZztcblx0XHR9KTtcblx0fVxuXHRsZXQgc3RhcnRlZCA9IGZhbHNlO1xuXHRyZXR1cm4ge1xuXHRcdHN0YXJ0KCkge1xuXHRcdFx0aWYgKHN0YXJ0ZWQpIHJldHVybjtcblx0XHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdFx0ZGVsZXRlX3J1bGUobm9kZSk7XG5cdFx0XHRpZiAoaXNfZnVuY3Rpb24oY29uZmlnKSkge1xuXHRcdFx0XHRjb25maWcgPSBjb25maWcob3B0aW9ucyk7XG5cdFx0XHRcdHdhaXQoKS50aGVuKGdvKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdvKCk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRpbnZhbGlkYXRlKCkge1xuXHRcdFx0c3RhcnRlZCA9IGZhbHNlO1xuXHRcdH0sXG5cdFx0ZW5kKCkge1xuXHRcdFx0aWYgKHJ1bm5pbmcpIHtcblx0XHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0XHRydW5uaW5nID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RWxlbWVudCAmIEVsZW1lbnRDU1NJbmxpbmVTdHlsZX0gbm9kZVxuICogQHBhcmFtIHtUcmFuc2l0aW9uRm59IGZuXG4gKiBAcGFyYW0ge2FueX0gcGFyYW1zXG4gKiBAcmV0dXJucyB7eyBlbmQocmVzZXQ6IGFueSk6IHZvaWQ7IH19XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVfb3V0X3RyYW5zaXRpb24obm9kZSwgZm4sIHBhcmFtcykge1xuXHQvKiogQHR5cGUge1RyYW5zaXRpb25PcHRpb25zfSAqL1xuXHRjb25zdCBvcHRpb25zID0geyBkaXJlY3Rpb246ICdvdXQnIH07XG5cdGxldCBjb25maWcgPSBmbihub2RlLCBwYXJhbXMsIG9wdGlvbnMpO1xuXHRsZXQgcnVubmluZyA9IHRydWU7XG5cdGxldCBhbmltYXRpb25fbmFtZTtcblx0Y29uc3QgZ3JvdXAgPSBvdXRyb3M7XG5cdGdyb3VwLnIgKz0gMTtcblx0LyoqIEB0eXBlIHtib29sZWFufSAqL1xuXHRsZXQgb3JpZ2luYWxfaW5lcnRfdmFsdWU7XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBnbygpIHtcblx0XHRjb25zdCB7XG5cdFx0XHRkZWxheSA9IDAsXG5cdFx0XHRkdXJhdGlvbiA9IDMwMCxcblx0XHRcdGVhc2luZyA9IGxpbmVhcixcblx0XHRcdHRpY2sgPSBub29wLFxuXHRcdFx0Y3NzXG5cdFx0fSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG5cblx0XHRpZiAoY3NzKSBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDEsIDAsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuXG5cdFx0Y29uc3Qgc3RhcnRfdGltZSA9IG5vdygpICsgZGVsYXk7XG5cdFx0Y29uc3QgZW5kX3RpbWUgPSBzdGFydF90aW1lICsgZHVyYXRpb247XG5cdFx0YWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiBkaXNwYXRjaChub2RlLCBmYWxzZSwgJ3N0YXJ0JykpO1xuXG5cdFx0aWYgKCdpbmVydCcgaW4gbm9kZSkge1xuXHRcdFx0b3JpZ2luYWxfaW5lcnRfdmFsdWUgPSAvKiogQHR5cGUge0hUTUxFbGVtZW50fSAqLyAobm9kZSkuaW5lcnQ7XG5cdFx0XHRub2RlLmluZXJ0ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRsb29wKChub3cpID0+IHtcblx0XHRcdGlmIChydW5uaW5nKSB7XG5cdFx0XHRcdGlmIChub3cgPj0gZW5kX3RpbWUpIHtcblx0XHRcdFx0XHR0aWNrKDAsIDEpO1xuXHRcdFx0XHRcdGRpc3BhdGNoKG5vZGUsIGZhbHNlLCAnZW5kJyk7XG5cdFx0XHRcdFx0aWYgKCEtLWdyb3VwLnIpIHtcblx0XHRcdFx0XHRcdC8vIHRoaXMgd2lsbCByZXN1bHQgaW4gYGVuZCgpYCBiZWluZyBjYWxsZWQsXG5cdFx0XHRcdFx0XHQvLyBzbyB3ZSBkb24ndCBuZWVkIHRvIGNsZWFuIHVwIGhlcmVcblx0XHRcdFx0XHRcdHJ1bl9hbGwoZ3JvdXAuYyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobm93ID49IHN0YXJ0X3RpbWUpIHtcblx0XHRcdFx0XHRjb25zdCB0ID0gZWFzaW5nKChub3cgLSBzdGFydF90aW1lKSAvIGR1cmF0aW9uKTtcblx0XHRcdFx0XHR0aWNrKDEgLSB0LCB0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJ1bm5pbmc7XG5cdFx0fSk7XG5cdH1cblxuXHRpZiAoaXNfZnVuY3Rpb24oY29uZmlnKSkge1xuXHRcdHdhaXQoKS50aGVuKCgpID0+IHtcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdGNvbmZpZyA9IGNvbmZpZyhvcHRpb25zKTtcblx0XHRcdGdvKCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0Z28oKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0ZW5kKHJlc2V0KSB7XG5cdFx0XHRpZiAocmVzZXQgJiYgJ2luZXJ0JyBpbiBub2RlKSB7XG5cdFx0XHRcdG5vZGUuaW5lcnQgPSBvcmlnaW5hbF9pbmVydF92YWx1ZTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNldCAmJiBjb25maWcudGljaykge1xuXHRcdFx0XHRjb25maWcudGljaygxLCAwKTtcblx0XHRcdH1cblx0XHRcdGlmIChydW5uaW5nKSB7XG5cdFx0XHRcdGlmIChhbmltYXRpb25fbmFtZSkgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuXHRcdFx0XHRydW5uaW5nID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RWxlbWVudCAmIEVsZW1lbnRDU1NJbmxpbmVTdHlsZX0gbm9kZVxuICogQHBhcmFtIHtUcmFuc2l0aW9uRm59IGZuXG4gKiBAcGFyYW0ge2FueX0gcGFyYW1zXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGludHJvXG4gKiBAcmV0dXJucyB7eyBydW4oYjogMCB8IDEpOiB2b2lkOyBlbmQoKTogdm9pZDsgfX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9iaWRpcmVjdGlvbmFsX3RyYW5zaXRpb24obm9kZSwgZm4sIHBhcmFtcywgaW50cm8pIHtcblx0LyoqXG5cdCAqIEB0eXBlIHtUcmFuc2l0aW9uT3B0aW9uc30gKi9cblx0Y29uc3Qgb3B0aW9ucyA9IHsgZGlyZWN0aW9uOiAnYm90aCcgfTtcblx0bGV0IGNvbmZpZyA9IGZuKG5vZGUsIHBhcmFtcywgb3B0aW9ucyk7XG5cdGxldCB0ID0gaW50cm8gPyAwIDogMTtcblxuXHQvKipcblx0ICogQHR5cGUge1Byb2dyYW0gfCBudWxsfSAqL1xuXHRsZXQgcnVubmluZ19wcm9ncmFtID0gbnVsbDtcblxuXHQvKipcblx0ICogQHR5cGUge1BlbmRpbmdQcm9ncmFtIHwgbnVsbH0gKi9cblx0bGV0IHBlbmRpbmdfcHJvZ3JhbSA9IG51bGw7XG5cdGxldCBhbmltYXRpb25fbmFtZSA9IG51bGw7XG5cblx0LyoqIEB0eXBlIHtib29sZWFufSAqL1xuXHRsZXQgb3JpZ2luYWxfaW5lcnRfdmFsdWU7XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBjbGVhcl9hbmltYXRpb24oKSB7XG5cdFx0aWYgKGFuaW1hdGlvbl9uYW1lKSBkZWxldGVfcnVsZShub2RlLCBhbmltYXRpb25fbmFtZSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtQZW5kaW5nUHJvZ3JhbX0gcHJvZ3JhbVxuXHQgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb25cblx0ICogQHJldHVybnMge1Byb2dyYW19XG5cdCAqL1xuXHRmdW5jdGlvbiBpbml0KHByb2dyYW0sIGR1cmF0aW9uKSB7XG5cdFx0Y29uc3QgZCA9IC8qKiBAdHlwZSB7UHJvZ3JhbVsnZCddfSAqLyAocHJvZ3JhbS5iIC0gdCk7XG5cdFx0ZHVyYXRpb24gKj0gTWF0aC5hYnMoZCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGE6IHQsXG5cdFx0XHRiOiBwcm9ncmFtLmIsXG5cdFx0XHRkLFxuXHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRzdGFydDogcHJvZ3JhbS5zdGFydCxcblx0XHRcdGVuZDogcHJvZ3JhbS5zdGFydCArIGR1cmF0aW9uLFxuXHRcdFx0Z3JvdXA6IHByb2dyYW0uZ3JvdXBcblx0XHR9O1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7SU5UUk8gfCBPVVRST30gYlxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGZ1bmN0aW9uIGdvKGIpIHtcblx0XHRjb25zdCB7XG5cdFx0XHRkZWxheSA9IDAsXG5cdFx0XHRkdXJhdGlvbiA9IDMwMCxcblx0XHRcdGVhc2luZyA9IGxpbmVhcixcblx0XHRcdHRpY2sgPSBub29wLFxuXHRcdFx0Y3NzXG5cdFx0fSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG5cblx0XHQvKipcblx0XHQgKiBAdHlwZSB7UGVuZGluZ1Byb2dyYW19ICovXG5cdFx0Y29uc3QgcHJvZ3JhbSA9IHtcblx0XHRcdHN0YXJ0OiBub3coKSArIGRlbGF5LFxuXHRcdFx0YlxuXHRcdH07XG5cblx0XHRpZiAoIWIpIHtcblx0XHRcdC8vIEB0cy1pZ25vcmUgdG9kbzogaW1wcm92ZSB0eXBpbmdzXG5cdFx0XHRwcm9ncmFtLmdyb3VwID0gb3V0cm9zO1xuXHRcdFx0b3V0cm9zLnIgKz0gMTtcblx0XHR9XG5cblx0XHRpZiAoJ2luZXJ0JyBpbiBub2RlKSB7XG5cdFx0XHRpZiAoYikge1xuXHRcdFx0XHRpZiAob3JpZ2luYWxfaW5lcnRfdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdC8vIGFib3J0ZWQvcmV2ZXJzZWQgb3V0cm8g4oCUIHJlc3RvcmUgcHJldmlvdXMgaW5lcnQgdmFsdWVcblx0XHRcdFx0XHRub2RlLmluZXJ0ID0gb3JpZ2luYWxfaW5lcnRfdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG9yaWdpbmFsX2luZXJ0X3ZhbHVlID0gLyoqIEB0eXBlIHtIVE1MRWxlbWVudH0gKi8gKG5vZGUpLmluZXJ0O1xuXHRcdFx0XHRub2RlLmluZXJ0ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAocnVubmluZ19wcm9ncmFtIHx8IHBlbmRpbmdfcHJvZ3JhbSkge1xuXHRcdFx0cGVuZGluZ19wcm9ncmFtID0gcHJvZ3JhbTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gaWYgdGhpcyBpcyBhbiBpbnRybywgYW5kIHRoZXJlJ3MgYSBkZWxheSwgd2UgbmVlZCB0byBkb1xuXHRcdFx0Ly8gYW4gaW5pdGlhbCB0aWNrIGFuZC9vciBhcHBseSBDU1MgYW5pbWF0aW9uIGltbWVkaWF0ZWx5XG5cdFx0XHRpZiAoY3NzKSB7XG5cdFx0XHRcdGNsZWFyX2FuaW1hdGlvbigpO1xuXHRcdFx0XHRhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIHQsIGIsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGIpIHRpY2soMCwgMSk7XG5cdFx0XHRydW5uaW5nX3Byb2dyYW0gPSBpbml0KHByb2dyYW0sIGR1cmF0aW9uKTtcblx0XHRcdGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgYiwgJ3N0YXJ0JykpO1xuXHRcdFx0bG9vcCgobm93KSA9PiB7XG5cdFx0XHRcdGlmIChwZW5kaW5nX3Byb2dyYW0gJiYgbm93ID4gcGVuZGluZ19wcm9ncmFtLnN0YXJ0KSB7XG5cdFx0XHRcdFx0cnVubmluZ19wcm9ncmFtID0gaW5pdChwZW5kaW5nX3Byb2dyYW0sIGR1cmF0aW9uKTtcblx0XHRcdFx0XHRwZW5kaW5nX3Byb2dyYW0gPSBudWxsO1xuXHRcdFx0XHRcdGRpc3BhdGNoKG5vZGUsIHJ1bm5pbmdfcHJvZ3JhbS5iLCAnc3RhcnQnKTtcblx0XHRcdFx0XHRpZiAoY3NzKSB7XG5cdFx0XHRcdFx0XHRjbGVhcl9hbmltYXRpb24oKTtcblx0XHRcdFx0XHRcdGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUoXG5cdFx0XHRcdFx0XHRcdG5vZGUsXG5cdFx0XHRcdFx0XHRcdHQsXG5cdFx0XHRcdFx0XHRcdHJ1bm5pbmdfcHJvZ3JhbS5iLFxuXHRcdFx0XHRcdFx0XHRydW5uaW5nX3Byb2dyYW0uZHVyYXRpb24sXG5cdFx0XHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0XHRcdGVhc2luZyxcblx0XHRcdFx0XHRcdFx0Y29uZmlnLmNzc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bm5pbmdfcHJvZ3JhbSkge1xuXHRcdFx0XHRcdGlmIChub3cgPj0gcnVubmluZ19wcm9ncmFtLmVuZCkge1xuXHRcdFx0XHRcdFx0dGljaygodCA9IHJ1bm5pbmdfcHJvZ3JhbS5iKSwgMSAtIHQpO1xuXHRcdFx0XHRcdFx0ZGlzcGF0Y2gobm9kZSwgcnVubmluZ19wcm9ncmFtLmIsICdlbmQnKTtcblx0XHRcdFx0XHRcdGlmICghcGVuZGluZ19wcm9ncmFtKSB7XG5cdFx0XHRcdFx0XHRcdC8vIHdlJ3JlIGRvbmVcblx0XHRcdFx0XHRcdFx0aWYgKHJ1bm5pbmdfcHJvZ3JhbS5iKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gaW50cm8g4oCUIHdlIGNhbiB0aWR5IHVwIGltbWVkaWF0ZWx5XG5cdFx0XHRcdFx0XHRcdFx0Y2xlYXJfYW5pbWF0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gb3V0cm8g4oCUIG5lZWRzIHRvIGJlIGNvb3JkaW5hdGVkXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCEtLXJ1bm5pbmdfcHJvZ3JhbS5ncm91cC5yKSBydW5fYWxsKHJ1bm5pbmdfcHJvZ3JhbS5ncm91cC5jKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cnVubmluZ19wcm9ncmFtID0gbnVsbDtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG5vdyA+PSBydW5uaW5nX3Byb2dyYW0uc3RhcnQpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHAgPSBub3cgLSBydW5uaW5nX3Byb2dyYW0uc3RhcnQ7XG5cdFx0XHRcdFx0XHR0ID0gcnVubmluZ19wcm9ncmFtLmEgKyBydW5uaW5nX3Byb2dyYW0uZCAqIGVhc2luZyhwIC8gcnVubmluZ19wcm9ncmFtLmR1cmF0aW9uKTtcblx0XHRcdFx0XHRcdHRpY2sodCwgMSAtIHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gISEocnVubmluZ19wcm9ncmFtIHx8IHBlbmRpbmdfcHJvZ3JhbSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHtcblx0XHRydW4oYikge1xuXHRcdFx0aWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcblx0XHRcdFx0d2FpdCgpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IG9wdHMgPSB7IGRpcmVjdGlvbjogYiA/ICdpbicgOiAnb3V0JyB9O1xuXHRcdFx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0XHRjb25maWcgPSBjb25maWcob3B0cyk7XG5cdFx0XHRcdFx0Z28oYik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Z28oYik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbmQoKSB7XG5cdFx0XHRjbGVhcl9hbmltYXRpb24oKTtcblx0XHRcdHJ1bm5pbmdfcHJvZ3JhbSA9IHBlbmRpbmdfcHJvZ3JhbSA9IG51bGw7XG5cdFx0fVxuXHR9O1xufVxuXG4vKiogQHR5cGVkZWYgezF9IElOVFJPICovXG4vKiogQHR5cGVkZWYgezB9IE9VVFJPICovXG4vKiogQHR5cGVkZWYge3sgZGlyZWN0aW9uOiAnaW4nIHwgJ291dCcgfCAnYm90aCcgfX0gVHJhbnNpdGlvbk9wdGlvbnMgKi9cbi8qKiBAdHlwZWRlZiB7KG5vZGU6IEVsZW1lbnQsIHBhcmFtczogYW55LCBvcHRpb25zOiBUcmFuc2l0aW9uT3B0aW9ucykgPT4gaW1wb3J0KCcuLi90cmFuc2l0aW9uL3B1YmxpYy5qcycpLlRyYW5zaXRpb25Db25maWd9IFRyYW5zaXRpb25GbiAqL1xuXG4vKipcbiAqIEB0eXBlZGVmIHtPYmplY3R9IE91dHJvXG4gKiBAcHJvcGVydHkge251bWJlcn0gclxuICogQHByb3BlcnR5IHtGdW5jdGlvbltdfSBjXG4gKiBAcHJvcGVydHkge09iamVjdH0gcFxuICovXG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gUGVuZGluZ1Byb2dyYW1cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzdGFydFxuICogQHByb3BlcnR5IHtJTlRST3xPVVRST30gYlxuICogQHByb3BlcnR5IHtPdXRyb30gW2dyb3VwXVxuICovXG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gUHJvZ3JhbVxuICogQHByb3BlcnR5IHtudW1iZXJ9IGFcbiAqIEBwcm9wZXJ0eSB7SU5UUk98T1VUUk99IGJcbiAqIEBwcm9wZXJ0eSB7MXwtMX0gZFxuICogQHByb3BlcnR5IHtudW1iZXJ9IGR1cmF0aW9uXG4gKiBAcHJvcGVydHkge251bWJlcn0gc3RhcnRcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBlbmRcbiAqIEBwcm9wZXJ0eSB7T3V0cm99IFtncm91cF1cbiAqL1xuIiwiaW1wb3J0IHsgdHJhbnNpdGlvbl9pbiwgdHJhbnNpdGlvbl9vdXQgfSBmcm9tICcuL3RyYW5zaXRpb25zLmpzJztcbmltcG9ydCB7IHJ1bl9hbGwgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuLy8gZ2VuZXJhbCBlYWNoIGZ1bmN0aW9uczpcblxuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZV9hcnJheV9saWtlKGFycmF5X2xpa2Vfb3JfaXRlcmF0b3IpIHtcblx0cmV0dXJuIGFycmF5X2xpa2Vfb3JfaXRlcmF0b3I/Lmxlbmd0aCAhPT0gdW5kZWZpbmVkXG5cdFx0PyBhcnJheV9saWtlX29yX2l0ZXJhdG9yXG5cdFx0OiBBcnJheS5mcm9tKGFycmF5X2xpa2Vfb3JfaXRlcmF0b3IpO1xufVxuXG4vLyBrZXllZCBlYWNoIGZ1bmN0aW9uczpcblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuXHRibG9jay5kKDEpO1xuXHRsb29rdXAuZGVsZXRlKGJsb2NrLmtleSk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBvdXRyb19hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG5cdHRyYW5zaXRpb25fb3V0KGJsb2NrLCAxLCAxLCAoKSA9PiB7XG5cdFx0bG9va3VwLmRlbGV0ZShibG9jay5rZXkpO1xuXHR9KTtcbn1cblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpeF9hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG5cdGJsb2NrLmYoKTtcblx0ZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKTtcbn1cblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpeF9hbmRfb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuXHRibG9jay5mKCk7XG5cdG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApO1xufVxuXG4vKiogQHJldHVybnMge2FueVtdfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZV9rZXllZF9lYWNoKFxuXHRvbGRfYmxvY2tzLFxuXHRkaXJ0eSxcblx0Z2V0X2tleSxcblx0ZHluYW1pYyxcblx0Y3R4LFxuXHRsaXN0LFxuXHRsb29rdXAsXG5cdG5vZGUsXG5cdGRlc3Ryb3ksXG5cdGNyZWF0ZV9lYWNoX2Jsb2NrLFxuXHRuZXh0LFxuXHRnZXRfY29udGV4dFxuKSB7XG5cdGxldCBvID0gb2xkX2Jsb2Nrcy5sZW5ndGg7XG5cdGxldCBuID0gbGlzdC5sZW5ndGg7XG5cdGxldCBpID0gbztcblx0Y29uc3Qgb2xkX2luZGV4ZXMgPSB7fTtcblx0d2hpbGUgKGktLSkgb2xkX2luZGV4ZXNbb2xkX2Jsb2Nrc1tpXS5rZXldID0gaTtcblx0Y29uc3QgbmV3X2Jsb2NrcyA9IFtdO1xuXHRjb25zdCBuZXdfbG9va3VwID0gbmV3IE1hcCgpO1xuXHRjb25zdCBkZWx0YXMgPSBuZXcgTWFwKCk7XG5cdGNvbnN0IHVwZGF0ZXMgPSBbXTtcblx0aSA9IG47XG5cdHdoaWxlIChpLS0pIHtcblx0XHRjb25zdCBjaGlsZF9jdHggPSBnZXRfY29udGV4dChjdHgsIGxpc3QsIGkpO1xuXHRcdGNvbnN0IGtleSA9IGdldF9rZXkoY2hpbGRfY3R4KTtcblx0XHRsZXQgYmxvY2sgPSBsb29rdXAuZ2V0KGtleSk7XG5cdFx0aWYgKCFibG9jaykge1xuXHRcdFx0YmxvY2sgPSBjcmVhdGVfZWFjaF9ibG9jayhrZXksIGNoaWxkX2N0eCk7XG5cdFx0XHRibG9jay5jKCk7XG5cdFx0fSBlbHNlIGlmIChkeW5hbWljKSB7XG5cdFx0XHQvLyBkZWZlciB1cGRhdGVzIHVudGlsIGFsbCB0aGUgRE9NIHNodWZmbGluZyBpcyBkb25lXG5cdFx0XHR1cGRhdGVzLnB1c2goKCkgPT4gYmxvY2sucChjaGlsZF9jdHgsIGRpcnR5KSk7XG5cdFx0fVxuXHRcdG5ld19sb29rdXAuc2V0KGtleSwgKG5ld19ibG9ja3NbaV0gPSBibG9jaykpO1xuXHRcdGlmIChrZXkgaW4gb2xkX2luZGV4ZXMpIGRlbHRhcy5zZXQoa2V5LCBNYXRoLmFicyhpIC0gb2xkX2luZGV4ZXNba2V5XSkpO1xuXHR9XG5cdGNvbnN0IHdpbGxfbW92ZSA9IG5ldyBTZXQoKTtcblx0Y29uc3QgZGlkX21vdmUgPSBuZXcgU2V0KCk7XG5cdC8qKiBAcmV0dXJucyB7dm9pZH0gKi9cblx0ZnVuY3Rpb24gaW5zZXJ0KGJsb2NrKSB7XG5cdFx0dHJhbnNpdGlvbl9pbihibG9jaywgMSk7XG5cdFx0YmxvY2subShub2RlLCBuZXh0KTtcblx0XHRsb29rdXAuc2V0KGJsb2NrLmtleSwgYmxvY2spO1xuXHRcdG5leHQgPSBibG9jay5maXJzdDtcblx0XHRuLS07XG5cdH1cblx0d2hpbGUgKG8gJiYgbikge1xuXHRcdGNvbnN0IG5ld19ibG9jayA9IG5ld19ibG9ja3NbbiAtIDFdO1xuXHRcdGNvbnN0IG9sZF9ibG9jayA9IG9sZF9ibG9ja3NbbyAtIDFdO1xuXHRcdGNvbnN0IG5ld19rZXkgPSBuZXdfYmxvY2sua2V5O1xuXHRcdGNvbnN0IG9sZF9rZXkgPSBvbGRfYmxvY2sua2V5O1xuXHRcdGlmIChuZXdfYmxvY2sgPT09IG9sZF9ibG9jaykge1xuXHRcdFx0Ly8gZG8gbm90aGluZ1xuXHRcdFx0bmV4dCA9IG5ld19ibG9jay5maXJzdDtcblx0XHRcdG8tLTtcblx0XHRcdG4tLTtcblx0XHR9IGVsc2UgaWYgKCFuZXdfbG9va3VwLmhhcyhvbGRfa2V5KSkge1xuXHRcdFx0Ly8gcmVtb3ZlIG9sZCBibG9ja1xuXHRcdFx0ZGVzdHJveShvbGRfYmxvY2ssIGxvb2t1cCk7XG5cdFx0XHRvLS07XG5cdFx0fSBlbHNlIGlmICghbG9va3VwLmhhcyhuZXdfa2V5KSB8fCB3aWxsX21vdmUuaGFzKG5ld19rZXkpKSB7XG5cdFx0XHRpbnNlcnQobmV3X2Jsb2NrKTtcblx0XHR9IGVsc2UgaWYgKGRpZF9tb3ZlLmhhcyhvbGRfa2V5KSkge1xuXHRcdFx0by0tO1xuXHRcdH0gZWxzZSBpZiAoZGVsdGFzLmdldChuZXdfa2V5KSA+IGRlbHRhcy5nZXQob2xkX2tleSkpIHtcblx0XHRcdGRpZF9tb3ZlLmFkZChuZXdfa2V5KTtcblx0XHRcdGluc2VydChuZXdfYmxvY2spO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR3aWxsX21vdmUuYWRkKG9sZF9rZXkpO1xuXHRcdFx0by0tO1xuXHRcdH1cblx0fVxuXHR3aGlsZSAoby0tKSB7XG5cdFx0Y29uc3Qgb2xkX2Jsb2NrID0gb2xkX2Jsb2Nrc1tvXTtcblx0XHRpZiAoIW5ld19sb29rdXAuaGFzKG9sZF9ibG9jay5rZXkpKSBkZXN0cm95KG9sZF9ibG9jaywgbG9va3VwKTtcblx0fVxuXHR3aGlsZSAobikgaW5zZXJ0KG5ld19ibG9ja3NbbiAtIDFdKTtcblx0cnVuX2FsbCh1cGRhdGVzKTtcblx0cmV0dXJuIG5ld19ibG9ja3M7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZV9lYWNoX2tleXMoY3R4LCBsaXN0LCBnZXRfY29udGV4dCwgZ2V0X2tleSkge1xuXHRjb25zdCBrZXlzID0gbmV3IE1hcCgpO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRjb25zdCBrZXkgPSBnZXRfa2V5KGdldF9jb250ZXh0KGN0eCwgbGlzdCwgaSkpO1xuXHRcdGlmIChrZXlzLmhhcyhrZXkpKSB7XG5cdFx0XHRsZXQgdmFsdWUgPSAnJztcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhbHVlID0gYHdpdGggdmFsdWUgJyR7U3RyaW5nKGtleSl9JyBgO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBjYW4ndCBzdHJpbmdpZnlcblx0XHRcdH1cblx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0YENhbm5vdCBoYXZlIGR1cGxpY2F0ZSBrZXlzIGluIGEga2V5ZWQgZWFjaDogS2V5cyBhdCBpbmRleCAke2tleXMuZ2V0KFxuXHRcdFx0XHRcdGtleVxuXHRcdFx0XHQpfSBhbmQgJHtpfSAke3ZhbHVlfWFyZSBkdXBsaWNhdGVzYFxuXHRcdFx0KTtcblx0XHR9XG5cdFx0a2V5cy5zZXQoa2V5LCBpKTtcblx0fVxufVxuIiwiLyoqIEByZXR1cm5zIHt7fX0gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRfc3ByZWFkX3VwZGF0ZShsZXZlbHMsIHVwZGF0ZXMpIHtcblx0Y29uc3QgdXBkYXRlID0ge307XG5cdGNvbnN0IHRvX251bGxfb3V0ID0ge307XG5cdGNvbnN0IGFjY291bnRlZF9mb3IgPSB7ICQkc2NvcGU6IDEgfTtcblx0bGV0IGkgPSBsZXZlbHMubGVuZ3RoO1xuXHR3aGlsZSAoaS0tKSB7XG5cdFx0Y29uc3QgbyA9IGxldmVsc1tpXTtcblx0XHRjb25zdCBuID0gdXBkYXRlc1tpXTtcblx0XHRpZiAobikge1xuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gbykge1xuXHRcdFx0XHRpZiAoIShrZXkgaW4gbikpIHRvX251bGxfb3V0W2tleV0gPSAxO1xuXHRcdFx0fVxuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gbikge1xuXHRcdFx0XHRpZiAoIWFjY291bnRlZF9mb3Jba2V5XSkge1xuXHRcdFx0XHRcdHVwZGF0ZVtrZXldID0gbltrZXldO1xuXHRcdFx0XHRcdGFjY291bnRlZF9mb3Jba2V5XSA9IDE7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGxldmVsc1tpXSA9IG47XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoY29uc3Qga2V5IGluIG8pIHtcblx0XHRcdFx0YWNjb3VudGVkX2ZvcltrZXldID0gMTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0Zm9yIChjb25zdCBrZXkgaW4gdG9fbnVsbF9vdXQpIHtcblx0XHRpZiAoIShrZXkgaW4gdXBkYXRlKSkgdXBkYXRlW2tleV0gPSB1bmRlZmluZWQ7XG5cdH1cblx0cmV0dXJuIHVwZGF0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF9zcHJlYWRfb2JqZWN0KHNwcmVhZF9wcm9wcykge1xuXHRyZXR1cm4gdHlwZW9mIHNwcmVhZF9wcm9wcyA9PT0gJ29iamVjdCcgJiYgc3ByZWFkX3Byb3BzICE9PSBudWxsID8gc3ByZWFkX3Byb3BzIDoge307XG59XG4iLCJpbXBvcnQge1xuXHRhZGRfcmVuZGVyX2NhbGxiYWNrLFxuXHRmbHVzaCxcblx0Zmx1c2hfcmVuZGVyX2NhbGxiYWNrcyxcblx0c2NoZWR1bGVfdXBkYXRlLFxuXHRkaXJ0eV9jb21wb25lbnRzXG59IGZyb20gJy4vc2NoZWR1bGVyLmpzJztcbmltcG9ydCB7IGN1cnJlbnRfY29tcG9uZW50LCBzZXRfY3VycmVudF9jb21wb25lbnQgfSBmcm9tICcuL2xpZmVjeWNsZS5qcyc7XG5pbXBvcnQgeyBibGFua19vYmplY3QsIGlzX2VtcHR5LCBpc19mdW5jdGlvbiwgcnVuLCBydW5fYWxsLCBub29wIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQge1xuXHRjaGlsZHJlbixcblx0ZGV0YWNoLFxuXHRzdGFydF9oeWRyYXRpbmcsXG5cdGVuZF9oeWRyYXRpbmcsXG5cdGdldF9jdXN0b21fZWxlbWVudHNfc2xvdHMsXG5cdGluc2VydCxcblx0ZWxlbWVudCxcblx0YXR0clxufSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyB0cmFuc2l0aW9uX2luIH0gZnJvbSAnLi90cmFuc2l0aW9ucy5qcyc7XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kKGNvbXBvbmVudCwgbmFtZSwgY2FsbGJhY2spIHtcblx0Y29uc3QgaW5kZXggPSBjb21wb25lbnQuJCQucHJvcHNbbmFtZV07XG5cdGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Y29tcG9uZW50LiQkLmJvdW5kW2luZGV4XSA9IGNhbGxiYWNrO1xuXHRcdGNhbGxiYWNrKGNvbXBvbmVudC4kJC5jdHhbaW5kZXhdKTtcblx0fVxufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlX2NvbXBvbmVudChibG9jaykge1xuXHRibG9jayAmJiBibG9jay5jKCk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFpbV9jb21wb25lbnQoYmxvY2ssIHBhcmVudF9ub2Rlcykge1xuXHRibG9jayAmJiBibG9jay5sKHBhcmVudF9ub2Rlcyk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBtb3VudF9jb21wb25lbnQoY29tcG9uZW50LCB0YXJnZXQsIGFuY2hvcikge1xuXHRjb25zdCB7IGZyYWdtZW50LCBhZnRlcl91cGRhdGUgfSA9IGNvbXBvbmVudC4kJDtcblx0ZnJhZ21lbnQgJiYgZnJhZ21lbnQubSh0YXJnZXQsIGFuY2hvcik7XG5cdC8vIG9uTW91bnQgaGFwcGVucyBiZWZvcmUgdGhlIGluaXRpYWwgYWZ0ZXJVcGRhdGVcblx0YWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiB7XG5cdFx0Y29uc3QgbmV3X29uX2Rlc3Ryb3kgPSBjb21wb25lbnQuJCQub25fbW91bnQubWFwKHJ1bikuZmlsdGVyKGlzX2Z1bmN0aW9uKTtcblx0XHQvLyBpZiB0aGUgY29tcG9uZW50IHdhcyBkZXN0cm95ZWQgaW1tZWRpYXRlbHlcblx0XHQvLyBpdCB3aWxsIHVwZGF0ZSB0aGUgYCQkLm9uX2Rlc3Ryb3lgIHJlZmVyZW5jZSB0byBgbnVsbGAuXG5cdFx0Ly8gdGhlIGRlc3RydWN0dXJlZCBvbl9kZXN0cm95IG1heSBzdGlsbCByZWZlcmVuY2UgdG8gdGhlIG9sZCBhcnJheVxuXHRcdGlmIChjb21wb25lbnQuJCQub25fZGVzdHJveSkge1xuXHRcdFx0Y29tcG9uZW50LiQkLm9uX2Rlc3Ryb3kucHVzaCguLi5uZXdfb25fZGVzdHJveSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEVkZ2UgY2FzZSAtIGNvbXBvbmVudCB3YXMgZGVzdHJveWVkIGltbWVkaWF0ZWx5LFxuXHRcdFx0Ly8gbW9zdCBsaWtlbHkgYXMgYSByZXN1bHQgb2YgYSBiaW5kaW5nIGluaXRpYWxpc2luZ1xuXHRcdFx0cnVuX2FsbChuZXdfb25fZGVzdHJveSk7XG5cdFx0fVxuXHRcdGNvbXBvbmVudC4kJC5vbl9tb3VudCA9IFtdO1xuXHR9KTtcblx0YWZ0ZXJfdXBkYXRlLmZvckVhY2goYWRkX3JlbmRlcl9jYWxsYmFjayk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXN0cm95X2NvbXBvbmVudChjb21wb25lbnQsIGRldGFjaGluZykge1xuXHRjb25zdCAkJCA9IGNvbXBvbmVudC4kJDtcblx0aWYgKCQkLmZyYWdtZW50ICE9PSBudWxsKSB7XG5cdFx0Zmx1c2hfcmVuZGVyX2NhbGxiYWNrcygkJC5hZnRlcl91cGRhdGUpO1xuXHRcdHJ1bl9hbGwoJCQub25fZGVzdHJveSk7XG5cdFx0JCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQuZChkZXRhY2hpbmcpO1xuXHRcdC8vIFRPRE8gbnVsbCBvdXQgb3RoZXIgcmVmcywgaW5jbHVkaW5nIGNvbXBvbmVudC4kJCAoYnV0IG5lZWQgdG9cblx0XHQvLyBwcmVzZXJ2ZSBmaW5hbCBzdGF0ZT8pXG5cdFx0JCQub25fZGVzdHJveSA9ICQkLmZyYWdtZW50ID0gbnVsbDtcblx0XHQkJC5jdHggPSBbXTtcblx0fVxufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5mdW5jdGlvbiBtYWtlX2RpcnR5KGNvbXBvbmVudCwgaSkge1xuXHRpZiAoY29tcG9uZW50LiQkLmRpcnR5WzBdID09PSAtMSkge1xuXHRcdGRpcnR5X2NvbXBvbmVudHMucHVzaChjb21wb25lbnQpO1xuXHRcdHNjaGVkdWxlX3VwZGF0ZSgpO1xuXHRcdGNvbXBvbmVudC4kJC5kaXJ0eS5maWxsKDApO1xuXHR9XG5cdGNvbXBvbmVudC4kJC5kaXJ0eVsoaSAvIDMxKSB8IDBdIHw9IDEgPDwgaSAlIDMxO1xufVxuXG4vLyBUT0RPOiBEb2N1bWVudCB0aGUgb3RoZXIgcGFyYW1zXG4vKipcbiAqIEBwYXJhbSB7U3ZlbHRlQ29tcG9uZW50fSBjb21wb25lbnRcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLkNvbXBvbmVudENvbnN0cnVjdG9yT3B0aW9uc30gb3B0aW9uc1xuICpcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3V0aWxzLmpzJylbJ25vdF9lcXVhbCddfSBub3RfZXF1YWwgVXNlZCB0byBjb21wYXJlIHByb3BzIGFuZCBzdGF0ZSB2YWx1ZXMuXG4gKiBAcGFyYW0geyh0YXJnZXQ6IEVsZW1lbnQgfCBTaGFkb3dSb290KSA9PiB2b2lkfSBbYXBwZW5kX3N0eWxlc10gRnVuY3Rpb24gdGhhdCBhcHBlbmRzIHN0eWxlcyB0byB0aGUgRE9NIHdoZW4gdGhlIGNvbXBvbmVudCBpcyBmaXJzdCBpbml0aWFsaXNlZC5cbiAqIFRoaXMgd2lsbCBiZSB0aGUgYGFkZF9jc3NgIGZ1bmN0aW9uIGZyb20gdGhlIGNvbXBpbGVkIGNvbXBvbmVudC5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXQoXG5cdGNvbXBvbmVudCxcblx0b3B0aW9ucyxcblx0aW5zdGFuY2UsXG5cdGNyZWF0ZV9mcmFnbWVudCxcblx0bm90X2VxdWFsLFxuXHRwcm9wcyxcblx0YXBwZW5kX3N0eWxlcyA9IG51bGwsXG5cdGRpcnR5ID0gWy0xXVxuKSB7XG5cdGNvbnN0IHBhcmVudF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcblx0c2V0X2N1cnJlbnRfY29tcG9uZW50KGNvbXBvbmVudCk7XG5cdC8qKiBAdHlwZSB7aW1wb3J0KCcuL3ByaXZhdGUuanMnKS5UJCR9ICovXG5cdGNvbnN0ICQkID0gKGNvbXBvbmVudC4kJCA9IHtcblx0XHRmcmFnbWVudDogbnVsbCxcblx0XHRjdHg6IFtdLFxuXHRcdC8vIHN0YXRlXG5cdFx0cHJvcHMsXG5cdFx0dXBkYXRlOiBub29wLFxuXHRcdG5vdF9lcXVhbCxcblx0XHRib3VuZDogYmxhbmtfb2JqZWN0KCksXG5cdFx0Ly8gbGlmZWN5Y2xlXG5cdFx0b25fbW91bnQ6IFtdLFxuXHRcdG9uX2Rlc3Ryb3k6IFtdLFxuXHRcdG9uX2Rpc2Nvbm5lY3Q6IFtdLFxuXHRcdGJlZm9yZV91cGRhdGU6IFtdLFxuXHRcdGFmdGVyX3VwZGF0ZTogW10sXG5cdFx0Y29udGV4dDogbmV3IE1hcChvcHRpb25zLmNvbnRleHQgfHwgKHBhcmVudF9jb21wb25lbnQgPyBwYXJlbnRfY29tcG9uZW50LiQkLmNvbnRleHQgOiBbXSkpLFxuXHRcdC8vIGV2ZXJ5dGhpbmcgZWxzZVxuXHRcdGNhbGxiYWNrczogYmxhbmtfb2JqZWN0KCksXG5cdFx0ZGlydHksXG5cdFx0c2tpcF9ib3VuZDogZmFsc2UsXG5cdFx0cm9vdDogb3B0aW9ucy50YXJnZXQgfHwgcGFyZW50X2NvbXBvbmVudC4kJC5yb290XG5cdH0pO1xuXHRhcHBlbmRfc3R5bGVzICYmIGFwcGVuZF9zdHlsZXMoJCQucm9vdCk7XG5cdGxldCByZWFkeSA9IGZhbHNlO1xuXHQkJC5jdHggPSBpbnN0YW5jZVxuXHRcdD8gaW5zdGFuY2UoY29tcG9uZW50LCBvcHRpb25zLnByb3BzIHx8IHt9LCAoaSwgcmV0LCAuLi5yZXN0KSA9PiB7XG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gcmVzdC5sZW5ndGggPyByZXN0WzBdIDogcmV0O1xuXHRcdFx0XHRpZiAoJCQuY3R4ICYmIG5vdF9lcXVhbCgkJC5jdHhbaV0sICgkJC5jdHhbaV0gPSB2YWx1ZSkpKSB7XG5cdFx0XHRcdFx0aWYgKCEkJC5za2lwX2JvdW5kICYmICQkLmJvdW5kW2ldKSAkJC5ib3VuZFtpXSh2YWx1ZSk7XG5cdFx0XHRcdFx0aWYgKHJlYWR5KSBtYWtlX2RpcnR5KGNvbXBvbmVudCwgaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHQgIH0pXG5cdFx0OiBbXTtcblx0JCQudXBkYXRlKCk7XG5cdHJlYWR5ID0gdHJ1ZTtcblx0cnVuX2FsbCgkJC5iZWZvcmVfdXBkYXRlKTtcblx0Ly8gYGZhbHNlYCBhcyBhIHNwZWNpYWwgY2FzZSBvZiBubyBET00gY29tcG9uZW50XG5cdCQkLmZyYWdtZW50ID0gY3JlYXRlX2ZyYWdtZW50ID8gY3JlYXRlX2ZyYWdtZW50KCQkLmN0eCkgOiBmYWxzZTtcblx0aWYgKG9wdGlvbnMudGFyZ2V0KSB7XG5cdFx0aWYgKG9wdGlvbnMuaHlkcmF0ZSkge1xuXHRcdFx0c3RhcnRfaHlkcmF0aW5nKCk7XG5cdFx0XHQvLyBUT0RPOiB3aGF0IGlzIHRoZSBjb3JyZWN0IHR5cGUgaGVyZT9cblx0XHRcdC8vIEB0cy1leHBlY3QtZXJyb3Jcblx0XHRcdGNvbnN0IG5vZGVzID0gY2hpbGRyZW4ob3B0aW9ucy50YXJnZXQpO1xuXHRcdFx0JCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQubChub2Rlcyk7XG5cdFx0XHRub2Rlcy5mb3JFYWNoKGRldGFjaCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG5cdFx0XHQkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5jKCk7XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLmludHJvKSB0cmFuc2l0aW9uX2luKGNvbXBvbmVudC4kJC5mcmFnbWVudCk7XG5cdFx0bW91bnRfY29tcG9uZW50KGNvbXBvbmVudCwgb3B0aW9ucy50YXJnZXQsIG9wdGlvbnMuYW5jaG9yKTtcblx0XHRlbmRfaHlkcmF0aW5nKCk7XG5cdFx0Zmx1c2goKTtcblx0fVxuXHRzZXRfY3VycmVudF9jb21wb25lbnQocGFyZW50X2NvbXBvbmVudCk7XG59XG5cbmV4cG9ydCBsZXQgU3ZlbHRlRWxlbWVudDtcblxuaWYgKHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRTdmVsdGVFbGVtZW50ID0gY2xhc3MgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cdFx0LyoqIFRoZSBTdmVsdGUgY29tcG9uZW50IGNvbnN0cnVjdG9yICovXG5cdFx0JCRjdG9yO1xuXHRcdC8qKiBTbG90cyAqL1xuXHRcdCQkcztcblx0XHQvKiogVGhlIFN2ZWx0ZSBjb21wb25lbnQgaW5zdGFuY2UgKi9cblx0XHQkJGM7XG5cdFx0LyoqIFdoZXRoZXIgb3Igbm90IHRoZSBjdXN0b20gZWxlbWVudCBpcyBjb25uZWN0ZWQgKi9cblx0XHQkJGNuID0gZmFsc2U7XG5cdFx0LyoqIENvbXBvbmVudCBwcm9wcyBkYXRhICovXG5cdFx0JCRkID0ge307XG5cdFx0LyoqIGB0cnVlYCBpZiBjdXJyZW50bHkgaW4gdGhlIHByb2Nlc3Mgb2YgcmVmbGVjdGluZyBjb21wb25lbnQgcHJvcHMgYmFjayB0byBhdHRyaWJ1dGVzICovXG5cdFx0JCRyID0gZmFsc2U7XG5cdFx0LyoqIEB0eXBlIHtSZWNvcmQ8c3RyaW5nLCBDdXN0b21FbGVtZW50UHJvcERlZmluaXRpb24+fSBQcm9wcyBkZWZpbml0aW9uIChuYW1lLCByZWZsZWN0ZWQsIHR5cGUgZXRjKSAqL1xuXHRcdCQkcF9kID0ge307XG5cdFx0LyoqIEB0eXBlIHtSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbltdPn0gRXZlbnQgbGlzdGVuZXJzICovXG5cdFx0JCRsID0ge307XG5cdFx0LyoqIEB0eXBlIHtNYXA8RnVuY3Rpb24sIEZ1bmN0aW9uPn0gRXZlbnQgbGlzdGVuZXIgdW5zdWJzY3JpYmUgZnVuY3Rpb25zICovXG5cdFx0JCRsX3UgPSBuZXcgTWFwKCk7XG5cblx0XHRjb25zdHJ1Y3RvcigkJGNvbXBvbmVudEN0b3IsICQkc2xvdHMsIHVzZV9zaGFkb3dfZG9tKSB7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpcy4kJGN0b3IgPSAkJGNvbXBvbmVudEN0b3I7XG5cdFx0XHR0aGlzLiQkcyA9ICQkc2xvdHM7XG5cdFx0XHRpZiAodXNlX3NoYWRvd19kb20pIHtcblx0XHRcdFx0dGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0YWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucykge1xuXHRcdFx0Ly8gV2UgY2FuJ3QgZGV0ZXJtaW5lIHVwZnJvbnQgaWYgdGhlIGV2ZW50IGlzIGEgY3VzdG9tIGV2ZW50IG9yIG5vdCwgc28gd2UgaGF2ZSB0b1xuXHRcdFx0Ly8gbGlzdGVuIHRvIGJvdGguIElmIHNvbWVvbmUgdXNlcyBhIGN1c3RvbSBldmVudCB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgYSByZWd1bGFyXG5cdFx0XHQvLyBicm93c2VyIGV2ZW50LCB0aGlzIGZpcmVzIHR3aWNlIC0gd2UgY2FuJ3QgYXZvaWQgdGhhdC5cblx0XHRcdHRoaXMuJCRsW3R5cGVdID0gdGhpcy4kJGxbdHlwZV0gfHwgW107XG5cdFx0XHR0aGlzLiQkbFt0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblx0XHRcdGlmICh0aGlzLiQkYykge1xuXHRcdFx0XHRjb25zdCB1bnN1YiA9IHRoaXMuJCRjLiRvbih0eXBlLCBsaXN0ZW5lcik7XG5cdFx0XHRcdHRoaXMuJCRsX3Uuc2V0KGxpc3RlbmVyLCB1bnN1Yik7XG5cdFx0XHR9XG5cdFx0XHRzdXBlci5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcblx0XHR9XG5cblx0XHRyZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKSB7XG5cdFx0XHRzdXBlci5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcblx0XHRcdGlmICh0aGlzLiQkYykge1xuXHRcdFx0XHRjb25zdCB1bnN1YiA9IHRoaXMuJCRsX3UuZ2V0KGxpc3RlbmVyKTtcblx0XHRcdFx0aWYgKHVuc3ViKSB7XG5cdFx0XHRcdFx0dW5zdWIoKTtcblx0XHRcdFx0XHR0aGlzLiQkbF91LmRlbGV0ZShsaXN0ZW5lcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRhc3luYyBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRcdHRoaXMuJCRjbiA9IHRydWU7XG5cdFx0XHRpZiAoIXRoaXMuJCRjKSB7XG5cdFx0XHRcdC8vIFdlIHdhaXQgb25lIHRpY2sgdG8gbGV0IHBvc3NpYmxlIGNoaWxkIHNsb3QgZWxlbWVudHMgYmUgY3JlYXRlZC9tb3VudGVkXG5cdFx0XHRcdGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdFx0XHRpZiAoIXRoaXMuJCRjbiB8fCB0aGlzLiQkYykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRmdW5jdGlvbiBjcmVhdGVfc2xvdChuYW1lKSB7XG5cdFx0XHRcdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdFx0XHRcdGxldCBub2RlO1xuXHRcdFx0XHRcdFx0Y29uc3Qgb2JqID0ge1xuXHRcdFx0XHRcdFx0XHRjOiBmdW5jdGlvbiBjcmVhdGUoKSB7XG5cdFx0XHRcdFx0XHRcdFx0bm9kZSA9IGVsZW1lbnQoJ3Nsb3QnKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAobmFtZSAhPT0gJ2RlZmF1bHQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhdHRyKG5vZGUsICduYW1lJywgbmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHRcdFx0ICogQHBhcmFtIHtIVE1MRWxlbWVudH0gdGFyZ2V0XG5cdFx0XHRcdFx0XHRcdCAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFthbmNob3JdXG5cdFx0XHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdFx0XHRtOiBmdW5jdGlvbiBtb3VudCh0YXJnZXQsIGFuY2hvcikge1xuXHRcdFx0XHRcdFx0XHRcdGluc2VydCh0YXJnZXQsIG5vZGUsIGFuY2hvcik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGQ6IGZ1bmN0aW9uIGRlc3Ryb3koZGV0YWNoaW5nKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGRldGFjaGluZykge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGV0YWNoKG5vZGUpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJldHVybiBvYmo7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCAkJHNsb3RzID0ge307XG5cdFx0XHRcdGNvbnN0IGV4aXN0aW5nX3Nsb3RzID0gZ2V0X2N1c3RvbV9lbGVtZW50c19zbG90cyh0aGlzKTtcblx0XHRcdFx0Zm9yIChjb25zdCBuYW1lIG9mIHRoaXMuJCRzKSB7XG5cdFx0XHRcdFx0aWYgKG5hbWUgaW4gZXhpc3Rpbmdfc2xvdHMpIHtcblx0XHRcdFx0XHRcdCQkc2xvdHNbbmFtZV0gPSBbY3JlYXRlX3Nsb3QobmFtZSldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiB0aGlzLmF0dHJpYnV0ZXMpIHtcblx0XHRcdFx0XHQvLyB0aGlzLiQkZGF0YSB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhpcy5hdHRyaWJ1dGVzXG5cdFx0XHRcdFx0Y29uc3QgbmFtZSA9IHRoaXMuJCRnX3AoYXR0cmlidXRlLm5hbWUpO1xuXHRcdFx0XHRcdGlmICghKG5hbWUgaW4gdGhpcy4kJGQpKSB7XG5cdFx0XHRcdFx0XHR0aGlzLiQkZFtuYW1lXSA9IGdldF9jdXN0b21fZWxlbWVudF92YWx1ZShuYW1lLCBhdHRyaWJ1dGUudmFsdWUsIHRoaXMuJCRwX2QsICd0b1Byb3AnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gUG9ydCBvdmVyIHByb3BzIHRoYXQgd2VyZSBzZXQgcHJvZ3JhbW1hdGljYWxseSBiZWZvcmUgY2Ugd2FzIGluaXRpYWxpemVkXG5cdFx0XHRcdGZvciAoY29uc3Qga2V5IGluIHRoaXMuJCRwX2QpIHtcblx0XHRcdFx0XHRpZiAoIShrZXkgaW4gdGhpcy4kJGQpICYmIHRoaXNba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHR0aGlzLiQkZFtrZXldID0gdGhpc1trZXldOyAvLyBkb24ndCB0cmFuc2Zvcm0sIHRoZXNlIHdlcmUgc2V0IHRocm91Z2ggSmF2YVNjcmlwdFxuXHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXNba2V5XTsgLy8gcmVtb3ZlIHRoZSBwcm9wZXJ0eSB0aGF0IHNoYWRvd3MgdGhlIGdldHRlci9zZXR0ZXJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kJGMgPSBuZXcgdGhpcy4kJGN0b3Ioe1xuXHRcdFx0XHRcdHRhcmdldDogdGhpcy5zaGFkb3dSb290IHx8IHRoaXMsXG5cdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdC4uLnRoaXMuJCRkLFxuXHRcdFx0XHRcdFx0JCRzbG90cyxcblx0XHRcdFx0XHRcdCQkc2NvcGU6IHtcblx0XHRcdFx0XHRcdFx0Y3R4OiBbXVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gUmVmbGVjdCBjb21wb25lbnQgcHJvcHMgYXMgYXR0cmlidXRlc1xuXHRcdFx0XHRjb25zdCByZWZsZWN0X2F0dHJpYnV0ZXMgPSAoKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy4kJHIgPSB0cnVlO1xuXHRcdFx0XHRcdGZvciAoY29uc3Qga2V5IGluIHRoaXMuJCRwX2QpIHtcblx0XHRcdFx0XHRcdHRoaXMuJCRkW2tleV0gPSB0aGlzLiQkYy4kJC5jdHhbdGhpcy4kJGMuJCQucHJvcHNba2V5XV07XG5cdFx0XHRcdFx0XHRpZiAodGhpcy4kJHBfZFtrZXldLnJlZmxlY3QpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgYXR0cmlidXRlX3ZhbHVlID0gZ2V0X2N1c3RvbV9lbGVtZW50X3ZhbHVlKFxuXHRcdFx0XHRcdFx0XHRcdGtleSxcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiQkZFtrZXldLFxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuJCRwX2QsXG5cdFx0XHRcdFx0XHRcdFx0J3RvQXR0cmlidXRlJ1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoYXR0cmlidXRlX3ZhbHVlID09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLiQkcF9kW2tleV0uYXR0cmlidXRlIHx8IGtleSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUodGhpcy4kJHBfZFtrZXldLmF0dHJpYnV0ZSB8fCBrZXksIGF0dHJpYnV0ZV92YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy4kJHIgPSBmYWxzZTtcblx0XHRcdFx0fTtcblx0XHRcdFx0dGhpcy4kJGMuJCQuYWZ0ZXJfdXBkYXRlLnB1c2gocmVmbGVjdF9hdHRyaWJ1dGVzKTtcblx0XHRcdFx0cmVmbGVjdF9hdHRyaWJ1dGVzKCk7IC8vIG9uY2UgaW5pdGlhbGx5IGJlY2F1c2UgYWZ0ZXJfdXBkYXRlIGlzIGFkZGVkIHRvbyBsYXRlIGZvciBmaXJzdCByZW5kZXJcblxuXHRcdFx0XHRmb3IgKGNvbnN0IHR5cGUgaW4gdGhpcy4kJGwpIHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIHRoaXMuJCRsW3R5cGVdKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1bnN1YiA9IHRoaXMuJCRjLiRvbih0eXBlLCBsaXN0ZW5lcik7XG5cdFx0XHRcdFx0XHR0aGlzLiQkbF91LnNldChsaXN0ZW5lciwgdW5zdWIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLiQkbCA9IHt9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFdlIGRvbid0IG5lZWQgdGhpcyB3aGVuIHdvcmtpbmcgd2l0aGluIFN2ZWx0ZSBjb2RlLCBidXQgZm9yIGNvbXBhdGliaWxpdHkgb2YgcGVvcGxlIHVzaW5nIHRoaXMgb3V0c2lkZSBvZiBTdmVsdGVcblx0XHQvLyBhbmQgc2V0dGluZyBhdHRyaWJ1dGVzIHRocm91Z2ggc2V0QXR0cmlidXRlIGV0YywgdGhpcyBpcyBoZWxwZnVsXG5cdFx0YXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGF0dHIsIF9vbGRWYWx1ZSwgbmV3VmFsdWUpIHtcblx0XHRcdGlmICh0aGlzLiQkcikgcmV0dXJuO1xuXHRcdFx0YXR0ciA9IHRoaXMuJCRnX3AoYXR0cik7XG5cdFx0XHR0aGlzLiQkZFthdHRyXSA9IGdldF9jdXN0b21fZWxlbWVudF92YWx1ZShhdHRyLCBuZXdWYWx1ZSwgdGhpcy4kJHBfZCwgJ3RvUHJvcCcpO1xuXHRcdFx0dGhpcy4kJGM/LiRzZXQoeyBbYXR0cl06IHRoaXMuJCRkW2F0dHJdIH0pO1xuXHRcdH1cblxuXHRcdGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuXHRcdFx0dGhpcy4kJGNuID0gZmFsc2U7XG5cdFx0XHQvLyBJbiBhIG1pY3JvdGFzaywgYmVjYXVzZSB0aGlzIGNvdWxkIGJlIGEgbW92ZSB3aXRoaW4gdGhlIERPTVxuXHRcdFx0UHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdGlmICghdGhpcy4kJGNuKSB7XG5cdFx0XHRcdFx0dGhpcy4kJGMuJGRlc3Ryb3koKTtcblx0XHRcdFx0XHR0aGlzLiQkYyA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0JCRnX3AoYXR0cmlidXRlX25hbWUpIHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMuJCRwX2QpLmZpbmQoXG5cdFx0XHRcdFx0KGtleSkgPT5cblx0XHRcdFx0XHRcdHRoaXMuJCRwX2Rba2V5XS5hdHRyaWJ1dGUgPT09IGF0dHJpYnV0ZV9uYW1lIHx8XG5cdFx0XHRcdFx0XHQoIXRoaXMuJCRwX2Rba2V5XS5hdHRyaWJ1dGUgJiYga2V5LnRvTG93ZXJDYXNlKCkgPT09IGF0dHJpYnV0ZV9uYW1lKVxuXHRcdFx0XHQpIHx8IGF0dHJpYnV0ZV9uYW1lXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcFxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcGFyYW0ge1JlY29yZDxzdHJpbmcsIEN1c3RvbUVsZW1lbnRQcm9wRGVmaW5pdGlvbj59IHByb3BzX2RlZmluaXRpb25cbiAqIEBwYXJhbSB7J3RvQXR0cmlidXRlJyB8ICd0b1Byb3AnfSBbdHJhbnNmb3JtXVxuICovXG5mdW5jdGlvbiBnZXRfY3VzdG9tX2VsZW1lbnRfdmFsdWUocHJvcCwgdmFsdWUsIHByb3BzX2RlZmluaXRpb24sIHRyYW5zZm9ybSkge1xuXHRjb25zdCB0eXBlID0gcHJvcHNfZGVmaW5pdGlvbltwcm9wXT8udHlwZTtcblx0dmFsdWUgPSB0eXBlID09PSAnQm9vbGVhbicgJiYgdHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicgPyB2YWx1ZSAhPSBudWxsIDogdmFsdWU7XG5cdGlmICghdHJhbnNmb3JtIHx8ICFwcm9wc19kZWZpbml0aW9uW3Byb3BdKSB7XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9IGVsc2UgaWYgKHRyYW5zZm9ybSA9PT0gJ3RvQXR0cmlidXRlJykge1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnT2JqZWN0Jzpcblx0XHRcdGNhc2UgJ0FycmF5Jzpcblx0XHRcdFx0cmV0dXJuIHZhbHVlID09IG51bGwgPyBudWxsIDogSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuXHRcdFx0Y2FzZSAnQm9vbGVhbic6XG5cdFx0XHRcdHJldHVybiB2YWx1ZSA/ICcnIDogbnVsbDtcblx0XHRcdGNhc2UgJ051bWJlcic6XG5cdFx0XHRcdHJldHVybiB2YWx1ZSA9PSBudWxsID8gbnVsbCA6IHZhbHVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdGNhc2UgJ09iamVjdCc6XG5cdFx0XHRjYXNlICdBcnJheSc6XG5cdFx0XHRcdHJldHVybiB2YWx1ZSAmJiBKU09OLnBhcnNlKHZhbHVlKTtcblx0XHRcdGNhc2UgJ0Jvb2xlYW4nOlxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7IC8vIGNvbnZlcnNpb24gYWxyZWFkeSBoYW5kbGVkIGFib3ZlXG5cdFx0XHRjYXNlICdOdW1iZXInOlxuXHRcdFx0XHRyZXR1cm4gdmFsdWUgIT0gbnVsbCA/ICt2YWx1ZSA6IHZhbHVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICpcbiAqIFR1cm4gYSBTdmVsdGUgY29tcG9uZW50IGludG8gYSBjdXN0b20gZWxlbWVudC5cbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLkNvbXBvbmVudFR5cGV9IENvbXBvbmVudCAgQSBTdmVsdGUgY29tcG9uZW50IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge1JlY29yZDxzdHJpbmcsIEN1c3RvbUVsZW1lbnRQcm9wRGVmaW5pdGlvbj59IHByb3BzX2RlZmluaXRpb24gIFRoZSBwcm9wcyB0byBvYnNlcnZlXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBzbG90cyAgVGhlIHNsb3RzIHRvIGNyZWF0ZVxuICogQHBhcmFtIHtzdHJpbmdbXX0gYWNjZXNzb3JzICBPdGhlciBhY2Nlc3NvcnMgYmVzaWRlcyB0aGUgb25lcyBmb3IgcHJvcHMgdGhlIGNvbXBvbmVudCBoYXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlX3NoYWRvd19kb20gIFdoZXRoZXIgdG8gdXNlIHNoYWRvdyBET01cbiAqIEBwYXJhbSB7KGNlOiBuZXcgKCkgPT4gSFRNTEVsZW1lbnQpID0+IG5ldyAoKSA9PiBIVE1MRWxlbWVudH0gW2V4dGVuZF1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9jdXN0b21fZWxlbWVudChcblx0Q29tcG9uZW50LFxuXHRwcm9wc19kZWZpbml0aW9uLFxuXHRzbG90cyxcblx0YWNjZXNzb3JzLFxuXHR1c2Vfc2hhZG93X2RvbSxcblx0ZXh0ZW5kXG4pIHtcblx0bGV0IENsYXNzID0gY2xhc3MgZXh0ZW5kcyBTdmVsdGVFbGVtZW50IHtcblx0XHRjb25zdHJ1Y3RvcigpIHtcblx0XHRcdHN1cGVyKENvbXBvbmVudCwgc2xvdHMsIHVzZV9zaGFkb3dfZG9tKTtcblx0XHRcdHRoaXMuJCRwX2QgPSBwcm9wc19kZWZpbml0aW9uO1xuXHRcdH1cblx0XHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhwcm9wc19kZWZpbml0aW9uKS5tYXAoKGtleSkgPT5cblx0XHRcdFx0KHByb3BzX2RlZmluaXRpb25ba2V5XS5hdHRyaWJ1dGUgfHwga2V5KS50b0xvd2VyQ2FzZSgpXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcblx0T2JqZWN0LmtleXMocHJvcHNfZGVmaW5pdGlvbikuZm9yRWFjaCgocHJvcCkgPT4ge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuJCRjICYmIHByb3AgaW4gdGhpcy4kJGMgPyB0aGlzLiQkY1twcm9wXSA6IHRoaXMuJCRkW3Byb3BdO1xuXHRcdFx0fSxcblx0XHRcdHNldCh2YWx1ZSkge1xuXHRcdFx0XHR2YWx1ZSA9IGdldF9jdXN0b21fZWxlbWVudF92YWx1ZShwcm9wLCB2YWx1ZSwgcHJvcHNfZGVmaW5pdGlvbik7XG5cdFx0XHRcdHRoaXMuJCRkW3Byb3BdID0gdmFsdWU7XG5cdFx0XHRcdHRoaXMuJCRjPy4kc2V0KHsgW3Byb3BdOiB2YWx1ZSB9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cdGFjY2Vzc29ycy5mb3JFYWNoKChhY2Nlc3NvcikgPT4ge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGFzcy5wcm90b3R5cGUsIGFjY2Vzc29yLCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLiQkYz8uW2FjY2Vzc29yXTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cdGlmIChleHRlbmQpIHtcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yIC0gYXNzaWduaW5nIGhlcmUgaXMgZmluZVxuXHRcdENsYXNzID0gZXh0ZW5kKENsYXNzKTtcblx0fVxuXHRDb21wb25lbnQuZWxlbWVudCA9IC8qKiBAdHlwZSB7YW55fSAqLyAoQ2xhc3MpO1xuXHRyZXR1cm4gQ2xhc3M7XG59XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgU3ZlbHRlIGNvbXBvbmVudHMuIFVzZWQgd2hlbiBkZXY9ZmFsc2UuXG4gKlxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbUHJvcHM9YW55XVxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRzPWFueV1cbiAqL1xuZXhwb3J0IGNsYXNzIFN2ZWx0ZUNvbXBvbmVudCB7XG5cdC8qKlxuXHQgKiAjIyMgUFJJVkFURSBBUElcblx0ICpcblx0ICogRG8gbm90IHVzZSwgbWF5IGNoYW5nZSBhdCBhbnkgdGltZVxuXHQgKlxuXHQgKiBAdHlwZSB7YW55fVxuXHQgKi9cblx0JCQgPSB1bmRlZmluZWQ7XG5cdC8qKlxuXHQgKiAjIyMgUFJJVkFURSBBUElcblx0ICpcblx0ICogRG8gbm90IHVzZSwgbWF5IGNoYW5nZSBhdCBhbnkgdGltZVxuXHQgKlxuXHQgKiBAdHlwZSB7YW55fVxuXHQgKi9cblx0JCRzZXQgPSB1bmRlZmluZWQ7XG5cblx0LyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHQkZGVzdHJveSgpIHtcblx0XHRkZXN0cm95X2NvbXBvbmVudCh0aGlzLCAxKTtcblx0XHR0aGlzLiRkZXN0cm95ID0gbm9vcDtcblx0fVxuXG5cdC8qKlxuXHQgKiBAdGVtcGxhdGUge0V4dHJhY3Q8a2V5b2YgRXZlbnRzLCBzdHJpbmc+fSBLXG5cdCAqIEBwYXJhbSB7S30gdHlwZVxuXHQgKiBAcGFyYW0geygoZTogRXZlbnRzW0tdKSA9PiB2b2lkKSB8IG51bGwgfCB1bmRlZmluZWR9IGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHsoKSA9PiB2b2lkfVxuXHQgKi9cblx0JG9uKHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKCFpc19mdW5jdGlvbihjYWxsYmFjaykpIHtcblx0XHRcdHJldHVybiBub29wO1xuXHRcdH1cblx0XHRjb25zdCBjYWxsYmFja3MgPSB0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSB8fCAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gPSBbXSk7XG5cdFx0Y2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXHRcdHJldHVybiAoKSA9PiB7XG5cdFx0XHRjb25zdCBpbmRleCA9IGNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKTtcblx0XHRcdGlmIChpbmRleCAhPT0gLTEpIGNhbGxiYWNrcy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdH07XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtQYXJ0aWFsPFByb3BzPn0gcHJvcHNcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHQkc2V0KHByb3BzKSB7XG5cdFx0aWYgKHRoaXMuJCRzZXQgJiYgIWlzX2VtcHR5KHByb3BzKSkge1xuXHRcdFx0dGhpcy4kJC5za2lwX2JvdW5kID0gdHJ1ZTtcblx0XHRcdHRoaXMuJCRzZXQocHJvcHMpO1xuXHRcdFx0dGhpcy4kJC5za2lwX2JvdW5kID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gQ3VzdG9tRWxlbWVudFByb3BEZWZpbml0aW9uXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2F0dHJpYnV0ZV1cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW3JlZmxlY3RdXG4gKiBAcHJvcGVydHkgeydTdHJpbmcnfCdCb29sZWFuJ3wnTnVtYmVyJ3wnQXJyYXknfCdPYmplY3QnfSBbdHlwZV1cbiAqL1xuIiwiLy8gZ2VuZXJhdGVkIGR1cmluZyByZWxlYXNlLCBkbyBub3QgbW9kaWZ5XG5cbi8qKlxuICogVGhlIGN1cnJlbnQgdmVyc2lvbiwgYXMgc2V0IGluIHBhY2thZ2UuanNvbi5cbiAqXG4gKiBodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUtY29tcGlsZXIjc3ZlbHRlLXZlcnNpb25cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBjb25zdCBWRVJTSU9OID0gJzQuMi4xMyc7XG5leHBvcnQgY29uc3QgUFVCTElDX1ZFUlNJT04gPSAnNCc7XG4iLCJpbXBvcnQgeyBQVUJMSUNfVkVSU0lPTiB9IGZyb20gJy4uLy4uLy4uL3NoYXJlZC92ZXJzaW9uLmpzJztcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXHQvLyBAdHMtaWdub3JlXG5cdCh3aW5kb3cuX19zdmVsdGUgfHwgKHdpbmRvdy5fX3N2ZWx0ZSA9IHsgdjogbmV3IFNldCgpIH0pKS52LmFkZChQVUJMSUNfVkVSU0lPTik7XG4iLCJ2YXIgZT1bXSx0PVtdO2Z1bmN0aW9uIG4obixyKXtpZihuJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgZG9jdW1lbnQpe3ZhciBhLHM9ITA9PT1yLnByZXBlbmQ/XCJwcmVwZW5kXCI6XCJhcHBlbmRcIixkPSEwPT09ci5zaW5nbGVUYWcsaT1cInN0cmluZ1wiPT10eXBlb2Ygci5jb250YWluZXI/ZG9jdW1lbnQucXVlcnlTZWxlY3RvcihyLmNvbnRhaW5lcik6ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdO2lmKGQpe3ZhciB1PWUuaW5kZXhPZihpKTstMT09PXUmJih1PWUucHVzaChpKS0xLHRbdV09e30pLGE9dFt1XSYmdFt1XVtzXT90W3VdW3NdOnRbdV1bc109YygpfWVsc2UgYT1jKCk7NjUyNzk9PT1uLmNoYXJDb2RlQXQoMCkmJihuPW4uc3Vic3RyaW5nKDEpKSxhLnN0eWxlU2hlZXQ/YS5zdHlsZVNoZWV0LmNzc1RleHQrPW46YS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShuKSl9ZnVuY3Rpb24gYygpe3ZhciBlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtpZihlLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpLHIuYXR0cmlidXRlcylmb3IodmFyIHQ9T2JqZWN0LmtleXMoci5hdHRyaWJ1dGVzKSxuPTA7bjx0Lmxlbmd0aDtuKyspZS5zZXRBdHRyaWJ1dGUodFtuXSxyLmF0dHJpYnV0ZXNbdFtuXV0pO3ZhciBhPVwicHJlcGVuZFwiPT09cz9cImFmdGVyYmVnaW5cIjpcImJlZm9yZWVuZFwiO3JldHVybiBpLmluc2VydEFkamFjZW50RWxlbWVudChhLGUpLGV9fWV4cG9ydHtuIGFzIGRlZmF1bHR9O1xuIiwiJ3VzZSBzdHJpY3QnO3ZhciBnPWd8fHt9O2cuc2NvcGU9e307Zy5hcnJheUl0ZXJhdG9ySW1wbD1mdW5jdGlvbihlKXt2YXIgaD0wO3JldHVybiBmdW5jdGlvbigpe3JldHVybiBoPGUubGVuZ3RoP3tkb25lOiExLHZhbHVlOmVbaCsrXX06e2RvbmU6ITB9fX07Zy5hcnJheUl0ZXJhdG9yPWZ1bmN0aW9uKGUpe3JldHVybntuZXh0OmcuYXJyYXlJdGVyYXRvckltcGwoZSl9fTtnLkFTU1VNRV9FUzU9ITE7Zy5BU1NVTUVfTk9fTkFUSVZFX01BUD0hMTtnLkFTU1VNRV9OT19OQVRJVkVfU0VUPSExO2cuU0lNUExFX0ZST1VORF9QT0xZRklMTD0hMTtnLklTT0xBVEVfUE9MWUZJTExTPSExO2cuRk9SQ0VfUE9MWUZJTExfUFJPTUlTRT0hMTtnLkZPUkNFX1BPTFlGSUxMX1BST01JU0VfV0hFTl9OT19VTkhBTkRMRURfUkVKRUNUSU9OPSExO1xuZy5kZWZpbmVQcm9wZXJ0eT1nLkFTU1VNRV9FUzV8fFwiZnVuY3Rpb25cIj09dHlwZW9mIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzP09iamVjdC5kZWZpbmVQcm9wZXJ0eTpmdW5jdGlvbihlLGgsbSl7aWYoZT09QXJyYXkucHJvdG90eXBlfHxlPT1PYmplY3QucHJvdG90eXBlKXJldHVybiBlO2VbaF09bS52YWx1ZTtyZXR1cm4gZX07Zy5nZXRHbG9iYWw9ZnVuY3Rpb24oZSl7ZT1bXCJvYmplY3RcIj09dHlwZW9mIGdsb2JhbFRoaXMmJmdsb2JhbFRoaXMsZSxcIm9iamVjdFwiPT10eXBlb2Ygd2luZG93JiZ3aW5kb3csXCJvYmplY3RcIj09dHlwZW9mIHNlbGYmJnNlbGYsXCJvYmplY3RcIj09dHlwZW9mIGdsb2JhbCYmZ2xvYmFsXTtmb3IodmFyIGg9MDtoPGUubGVuZ3RoOysraCl7dmFyIG09ZVtoXTtpZihtJiZtLk1hdGg9PU1hdGgpcmV0dXJuIG19dGhyb3cgRXJyb3IoXCJDYW5ub3QgZmluZCBnbG9iYWwgb2JqZWN0XCIpO307Zy5nbG9iYWw9Zy5nZXRHbG9iYWwodGhpcyk7XG5nLklTX1NZTUJPTF9OQVRJVkU9XCJmdW5jdGlvblwiPT09dHlwZW9mIFN5bWJvbCYmXCJzeW1ib2xcIj09PXR5cGVvZiBTeW1ib2woXCJ4XCIpO2cuVFJVU1RfRVM2X1BPTFlGSUxMUz0hZy5JU09MQVRFX1BPTFlGSUxMU3x8Zy5JU19TWU1CT0xfTkFUSVZFO2cucG9seWZpbGxzPXt9O2cucHJvcGVydHlUb1BvbHlmaWxsU3ltYm9sPXt9O2cuUE9MWUZJTExfUFJFRklYPVwiJGpzY3AkXCI7Zy5wb2x5ZmlsbD1mdW5jdGlvbihlLGgsbSxuKXtoJiYoZy5JU09MQVRFX1BPTFlGSUxMUz9nLnBvbHlmaWxsSXNvbGF0ZWQoZSxoLG0sbik6Zy5wb2x5ZmlsbFVuaXNvbGF0ZWQoZSxoLG0sbikpfTtcbmcucG9seWZpbGxVbmlzb2xhdGVkPWZ1bmN0aW9uKGUsaCl7dmFyIG09Zy5nbG9iYWw7ZT1lLnNwbGl0KFwiLlwiKTtmb3IodmFyIG49MDtuPGUubGVuZ3RoLTE7bisrKXt2YXIgdD1lW25dO2lmKCEodCBpbiBtKSlyZXR1cm47bT1tW3RdfWU9ZVtlLmxlbmd0aC0xXTtuPW1bZV07aD1oKG4pO2ghPW4mJm51bGwhPWgmJmcuZGVmaW5lUHJvcGVydHkobSxlLHtjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITAsdmFsdWU6aH0pfTtcbmcucG9seWZpbGxJc29sYXRlZD1mdW5jdGlvbihlLGgsbSl7dmFyIG49ZS5zcGxpdChcIi5cIik7ZT0xPT09bi5sZW5ndGg7dmFyIHQ9blswXTt0PSFlJiZ0IGluIGcucG9seWZpbGxzP2cucG9seWZpbGxzOmcuZ2xvYmFsO2Zvcih2YXIgdz0wO3c8bi5sZW5ndGgtMTt3Kyspe3ZhciB4PW5bd107aWYoISh4IGluIHQpKXJldHVybjt0PXRbeF19bj1uW24ubGVuZ3RoLTFdO209Zy5JU19TWU1CT0xfTkFUSVZFJiZcImVzNlwiPT09bT90W25dOm51bGw7aD1oKG0pO251bGwhPWgmJihlP2cuZGVmaW5lUHJvcGVydHkoZy5wb2x5ZmlsbHMsbix7Y29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOmh9KTpoIT09bSYmKHZvaWQgMD09PWcucHJvcGVydHlUb1BvbHlmaWxsU3ltYm9sW25dJiYoZT0xRTkqTWF0aC5yYW5kb20oKT4+PjAsZy5wcm9wZXJ0eVRvUG9seWZpbGxTeW1ib2xbbl09Zy5JU19TWU1CT0xfTkFUSVZFP2cuZ2xvYmFsLlN5bWJvbChuKTpnLlBPTFlGSUxMX1BSRUZJWCtlK1wiJFwiK1xubiksZy5kZWZpbmVQcm9wZXJ0eSh0LGcucHJvcGVydHlUb1BvbHlmaWxsU3ltYm9sW25dLHtjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITAsdmFsdWU6aH0pKSl9O2cuaW5pdFN5bWJvbD1mdW5jdGlvbigpe307XG5nLnBvbHlmaWxsKFwiU3ltYm9sXCIsZnVuY3Rpb24oZSl7ZnVuY3Rpb24gaCh3KXtpZih0aGlzIGluc3RhbmNlb2YgaCl0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sIGlzIG5vdCBhIGNvbnN0cnVjdG9yXCIpO3JldHVybiBuZXcgbShuKyh3fHxcIlwiKStcIl9cIit0Kyssdyl9ZnVuY3Rpb24gbSh3LHgpe3RoaXMuJGpzY29tcCRzeW1ib2wkaWRfPXc7Zy5kZWZpbmVQcm9wZXJ0eSh0aGlzLFwiZGVzY3JpcHRpb25cIix7Y29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOnh9KX1pZihlKXJldHVybiBlO20ucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuJGpzY29tcCRzeW1ib2wkaWRffTt2YXIgbj1cImpzY29tcF9zeW1ib2xfXCIrKDFFOSpNYXRoLnJhbmRvbSgpPj4+MCkrXCJfXCIsdD0wO3JldHVybiBofSxcImVzNlwiLFwiZXMzXCIpO1xuZy5wb2x5ZmlsbChcIlN5bWJvbC5pdGVyYXRvclwiLGZ1bmN0aW9uKGUpe2lmKGUpcmV0dXJuIGU7ZT1TeW1ib2woXCJTeW1ib2wuaXRlcmF0b3JcIik7Zm9yKHZhciBoPVwiQXJyYXkgSW50OEFycmF5IFVpbnQ4QXJyYXkgVWludDhDbGFtcGVkQXJyYXkgSW50MTZBcnJheSBVaW50MTZBcnJheSBJbnQzMkFycmF5IFVpbnQzMkFycmF5IEZsb2F0MzJBcnJheSBGbG9hdDY0QXJyYXlcIi5zcGxpdChcIiBcIiksbT0wO208aC5sZW5ndGg7bSsrKXt2YXIgbj1nLmdsb2JhbFtoW21dXTtcImZ1bmN0aW9uXCI9PT10eXBlb2YgbiYmXCJmdW5jdGlvblwiIT10eXBlb2Ygbi5wcm90b3R5cGVbZV0mJmcuZGVmaW5lUHJvcGVydHkobi5wcm90b3R5cGUsZSx7Y29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOmZ1bmN0aW9uKCl7cmV0dXJuIGcuaXRlcmF0b3JQcm90b3R5cGUoZy5hcnJheUl0ZXJhdG9ySW1wbCh0aGlzKSl9fSl9cmV0dXJuIGV9LFwiZXM2XCIsXCJlczNcIik7XG5nLml0ZXJhdG9yUHJvdG90eXBlPWZ1bmN0aW9uKGUpe2U9e25leHQ6ZX07ZVtTeW1ib2wuaXRlcmF0b3JdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9O3JldHVybiBlfTtnLml0ZXJhdG9yRnJvbUFycmF5PWZ1bmN0aW9uKGUsaCl7ZSBpbnN0YW5jZW9mIFN0cmluZyYmKGUrPVwiXCIpO3ZhciBtPTAsbj0hMSx0PXtuZXh0OmZ1bmN0aW9uKCl7aWYoIW4mJm08ZS5sZW5ndGgpe3ZhciB3PW0rKztyZXR1cm57dmFsdWU6aCh3LGVbd10pLGRvbmU6ITF9fW49ITA7cmV0dXJue2RvbmU6ITAsdmFsdWU6dm9pZCAwfX19O3RbU3ltYm9sLml0ZXJhdG9yXT1mdW5jdGlvbigpe3JldHVybiB0fTtyZXR1cm4gdH07Zy5wb2x5ZmlsbChcIkFycmF5LnByb3RvdHlwZS5rZXlzXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbigpe3JldHVybiBnLml0ZXJhdG9yRnJvbUFycmF5KHRoaXMsZnVuY3Rpb24oaCl7cmV0dXJuIGh9KX19LFwiZXM2XCIsXCJlczNcIik7XG5nLnBvbHlmaWxsKFwiQXJyYXkucHJvdG90eXBlLnZhbHVlc1wiLGZ1bmN0aW9uKGUpe3JldHVybiBlP2U6ZnVuY3Rpb24oKXtyZXR1cm4gZy5pdGVyYXRvckZyb21BcnJheSh0aGlzLGZ1bmN0aW9uKGgsbSl7cmV0dXJuIG19KX19LFwiZXM4XCIsXCJlczNcIik7Zy5jaGVja1N0cmluZ0FyZ3M9ZnVuY3Rpb24oZSxoLG0pe2lmKG51bGw9PWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIlRoZSAndGhpcycgdmFsdWUgZm9yIFN0cmluZy5wcm90b3R5cGUuXCIrbStcIiBtdXN0IG5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZFwiKTtpZihoIGluc3RhbmNlb2YgUmVnRXhwKXRocm93IG5ldyBUeXBlRXJyb3IoXCJGaXJzdCBhcmd1bWVudCB0byBTdHJpbmcucHJvdG90eXBlLlwiK20rXCIgbXVzdCBub3QgYmUgYSByZWd1bGFyIGV4cHJlc3Npb25cIik7cmV0dXJuIGUrXCJcIn07XG5nLnBvbHlmaWxsKFwiU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbihoLG0pe3ZhciBuPWcuY2hlY2tTdHJpbmdBcmdzKHRoaXMsaCxcInN0YXJ0c1dpdGhcIik7aCs9XCJcIjt2YXIgdD1uLmxlbmd0aCx3PWgubGVuZ3RoO209TWF0aC5tYXgoMCxNYXRoLm1pbihtfDAsbi5sZW5ndGgpKTtmb3IodmFyIHg9MDt4PHcmJm08dDspaWYoblttKytdIT1oW3grK10pcmV0dXJuITE7cmV0dXJuIHg+PXd9fSxcImVzNlwiLFwiZXMzXCIpO2cub3ducz1mdW5jdGlvbihlLGgpe3JldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZSxoKX07XG5nLmFzc2lnbj1nLlRSVVNUX0VTNl9QT0xZRklMTFMmJlwiZnVuY3Rpb25cIj09dHlwZW9mIE9iamVjdC5hc3NpZ24/T2JqZWN0LmFzc2lnbjpmdW5jdGlvbihlLGgpe2Zvcih2YXIgbT0xO208YXJndW1lbnRzLmxlbmd0aDttKyspe3ZhciBuPWFyZ3VtZW50c1ttXTtpZihuKWZvcih2YXIgdCBpbiBuKWcub3ducyhuLHQpJiYoZVt0XT1uW3RdKX1yZXR1cm4gZX07Zy5wb2x5ZmlsbChcIk9iamVjdC5hc3NpZ25cIixmdW5jdGlvbihlKXtyZXR1cm4gZXx8Zy5hc3NpZ259LFwiZXM2XCIsXCJlczNcIik7Zy5jaGVja0VzNkNvbmZvcm1hbmNlVmlhUHJveHk9ZnVuY3Rpb24oKXt0cnl7dmFyIGU9e30saD1PYmplY3QuY3JlYXRlKG5ldyBnLmdsb2JhbC5Qcm94eShlLHtnZXQ6ZnVuY3Rpb24obSxuLHQpe3JldHVybiBtPT1lJiZcInFcIj09biYmdD09aH19KSk7cmV0dXJuITA9PT1oLnF9Y2F0Y2gobSl7cmV0dXJuITF9fTtnLlVTRV9QUk9YWV9GT1JfRVM2X0NPTkZPUk1BTkNFX0NIRUNLUz0hMTtcbmcuRVM2X0NPTkZPUk1BTkNFPWcuVVNFX1BST1hZX0ZPUl9FUzZfQ09ORk9STUFOQ0VfQ0hFQ0tTJiZnLmNoZWNrRXM2Q29uZm9ybWFuY2VWaWFQcm94eSgpO2cubWFrZUl0ZXJhdG9yPWZ1bmN0aW9uKGUpe3ZhciBoPVwidW5kZWZpbmVkXCIhPXR5cGVvZiBTeW1ib2wmJlN5bWJvbC5pdGVyYXRvciYmZVtTeW1ib2wuaXRlcmF0b3JdO3JldHVybiBoP2guY2FsbChlKTpnLmFycmF5SXRlcmF0b3IoZSl9O1xuZy5wb2x5ZmlsbChcIldlYWtNYXBcIixmdW5jdGlvbihlKXtmdW5jdGlvbiBoKGwpe3RoaXMuaWRfPShwKz1NYXRoLnJhbmRvbSgpKzEpLnRvU3RyaW5nKCk7aWYobCl7bD1nLm1ha2VJdGVyYXRvcihsKTtmb3IodmFyIHE7IShxPWwubmV4dCgpKS5kb25lOylxPXEudmFsdWUsdGhpcy5zZXQocVswXSxxWzFdKX19ZnVuY3Rpb24gbSgpe2lmKCFlfHwhT2JqZWN0LnNlYWwpcmV0dXJuITE7dHJ5e3ZhciBsPU9iamVjdC5zZWFsKHt9KSxxPU9iamVjdC5zZWFsKHt9KSx2PW5ldyBlKFtbbCwyXSxbcSwzXV0pO2lmKDIhPXYuZ2V0KGwpfHwzIT12LmdldChxKSlyZXR1cm4hMTt2LmRlbGV0ZShsKTt2LnNldChxLDQpO3JldHVybiF2LmhhcyhsKSYmND09di5nZXQocSl9Y2F0Y2goQil7cmV0dXJuITF9fWZ1bmN0aW9uIG4oKXt9ZnVuY3Rpb24gdChsKXt2YXIgcT10eXBlb2YgbDtyZXR1cm5cIm9iamVjdFwiPT09cSYmbnVsbCE9PWx8fFwiZnVuY3Rpb25cIj09PXF9ZnVuY3Rpb24gdyhsKXtpZighZy5vd25zKGwsXG55KSl7dmFyIHE9bmV3IG47Zy5kZWZpbmVQcm9wZXJ0eShsLHkse3ZhbHVlOnF9KX19ZnVuY3Rpb24geChsKXtpZighZy5JU09MQVRFX1BPTFlGSUxMUyl7dmFyIHE9T2JqZWN0W2xdO3EmJihPYmplY3RbbF09ZnVuY3Rpb24odil7aWYodiBpbnN0YW5jZW9mIG4pcmV0dXJuIHY7T2JqZWN0LmlzRXh0ZW5zaWJsZSh2KSYmdyh2KTtyZXR1cm4gcSh2KX0pfX1pZihnLlVTRV9QUk9YWV9GT1JfRVM2X0NPTkZPUk1BTkNFX0NIRUNLUyl7aWYoZSYmZy5FUzZfQ09ORk9STUFOQ0UpcmV0dXJuIGV9ZWxzZSBpZihtKCkpcmV0dXJuIGU7dmFyIHk9XCIkanNjb21wX2hpZGRlbl9cIitNYXRoLnJhbmRvbSgpO3goXCJmcmVlemVcIik7eChcInByZXZlbnRFeHRlbnNpb25zXCIpO3goXCJzZWFsXCIpO3ZhciBwPTA7aC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKGwscSl7aWYoIXQobCkpdGhyb3cgRXJyb3IoXCJJbnZhbGlkIFdlYWtNYXAga2V5XCIpO3cobCk7aWYoIWcub3ducyhsLHkpKXRocm93IEVycm9yKFwiV2Vha01hcCBrZXkgZmFpbDogXCIrXG5sKTtsW3ldW3RoaXMuaWRfXT1xO3JldHVybiB0aGlzfTtoLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24obCl7cmV0dXJuIHQobCkmJmcub3ducyhsLHkpP2xbeV1bdGhpcy5pZF9dOnZvaWQgMH07aC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKGwpe3JldHVybiB0KGwpJiZnLm93bnMobCx5KSYmZy5vd25zKGxbeV0sdGhpcy5pZF8pfTtoLnByb3RvdHlwZS5kZWxldGU9ZnVuY3Rpb24obCl7cmV0dXJuIHQobCkmJmcub3ducyhsLHkpJiZnLm93bnMobFt5XSx0aGlzLmlkXyk/ZGVsZXRlIGxbeV1bdGhpcy5pZF9dOiExfTtyZXR1cm4gaH0sXCJlczZcIixcImVzM1wiKTtnLk1hcEVudHJ5PWZ1bmN0aW9uKCl7fTtcbmcucG9seWZpbGwoXCJNYXBcIixmdW5jdGlvbihlKXtmdW5jdGlvbiBoKCl7dmFyIHA9e307cmV0dXJuIHAucHJldmlvdXM9cC5uZXh0PXAuaGVhZD1wfWZ1bmN0aW9uIG0ocCxsKXt2YXIgcT1wLmhlYWRfO3JldHVybiBnLml0ZXJhdG9yUHJvdG90eXBlKGZ1bmN0aW9uKCl7aWYocSl7Zm9yKDtxLmhlYWQhPXAuaGVhZF87KXE9cS5wcmV2aW91cztmb3IoO3EubmV4dCE9cS5oZWFkOylyZXR1cm4gcT1xLm5leHQse2RvbmU6ITEsdmFsdWU6bChxKX07cT1udWxsfXJldHVybntkb25lOiEwLHZhbHVlOnZvaWQgMH19KX1mdW5jdGlvbiBuKHAsbCl7dmFyIHE9bCYmdHlwZW9mIGw7XCJvYmplY3RcIj09cXx8XCJmdW5jdGlvblwiPT1xP3guaGFzKGwpP3E9eC5nZXQobCk6KHE9XCJcIisgKyt5LHguc2V0KGwscSkpOnE9XCJwX1wiK2w7dmFyIHY9cC5kYXRhX1txXTtpZih2JiZnLm93bnMocC5kYXRhXyxxKSlmb3IocD0wO3A8di5sZW5ndGg7cCsrKXt2YXIgQj12W3BdO2lmKGwhPT1sJiZCLmtleSE9PUIua2V5fHxcbmw9PT1CLmtleSlyZXR1cm57aWQ6cSxsaXN0OnYsaW5kZXg6cCxlbnRyeTpCfX1yZXR1cm57aWQ6cSxsaXN0OnYsaW5kZXg6LTEsZW50cnk6dm9pZCAwfX1mdW5jdGlvbiB0KHApe3RoaXMuZGF0YV89e307dGhpcy5oZWFkXz1oKCk7dGhpcy5zaXplPTA7aWYocCl7cD1nLm1ha2VJdGVyYXRvcihwKTtmb3IodmFyIGw7IShsPXAubmV4dCgpKS5kb25lOylsPWwudmFsdWUsdGhpcy5zZXQobFswXSxsWzFdKX19ZnVuY3Rpb24gdygpe2lmKGcuQVNTVU1FX05PX05BVElWRV9NQVB8fCFlfHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBlfHwhZS5wcm90b3R5cGUuZW50cmllc3x8XCJmdW5jdGlvblwiIT10eXBlb2YgT2JqZWN0LnNlYWwpcmV0dXJuITE7dHJ5e3ZhciBwPU9iamVjdC5zZWFsKHt4OjR9KSxsPW5ldyBlKGcubWFrZUl0ZXJhdG9yKFtbcCxcInNcIl1dKSk7aWYoXCJzXCIhPWwuZ2V0KHApfHwxIT1sLnNpemV8fGwuZ2V0KHt4OjR9KXx8bC5zZXQoe3g6NH0sXCJ0XCIpIT1sfHwyIT1sLnNpemUpcmV0dXJuITE7XG52YXIgcT1sLmVudHJpZXMoKSx2PXEubmV4dCgpO2lmKHYuZG9uZXx8di52YWx1ZVswXSE9cHx8XCJzXCIhPXYudmFsdWVbMV0pcmV0dXJuITE7dj1xLm5leHQoKTtyZXR1cm4gdi5kb25lfHw0IT12LnZhbHVlWzBdLnh8fFwidFwiIT12LnZhbHVlWzFdfHwhcS5uZXh0KCkuZG9uZT8hMTohMH1jYXRjaChCKXtyZXR1cm4hMX19aWYoZy5VU0VfUFJPWFlfRk9SX0VTNl9DT05GT1JNQU5DRV9DSEVDS1Mpe2lmKGUmJmcuRVM2X0NPTkZPUk1BTkNFKXJldHVybiBlfWVsc2UgaWYodygpKXJldHVybiBlO3ZhciB4PW5ldyBXZWFrTWFwO3QucHJvdG90eXBlLnNldD1mdW5jdGlvbihwLGwpe3A9MD09PXA/MDpwO3ZhciBxPW4odGhpcyxwKTtxLmxpc3R8fChxLmxpc3Q9dGhpcy5kYXRhX1txLmlkXT1bXSk7cS5lbnRyeT9xLmVudHJ5LnZhbHVlPWw6KHEuZW50cnk9e25leHQ6dGhpcy5oZWFkXyxwcmV2aW91czp0aGlzLmhlYWRfLnByZXZpb3VzLGhlYWQ6dGhpcy5oZWFkXyxrZXk6cCx2YWx1ZTpsfSxxLmxpc3QucHVzaChxLmVudHJ5KSxcbnRoaXMuaGVhZF8ucHJldmlvdXMubmV4dD1xLmVudHJ5LHRoaXMuaGVhZF8ucHJldmlvdXM9cS5lbnRyeSx0aGlzLnNpemUrKyk7cmV0dXJuIHRoaXN9O3QucHJvdG90eXBlLmRlbGV0ZT1mdW5jdGlvbihwKXtwPW4odGhpcyxwKTtyZXR1cm4gcC5lbnRyeSYmcC5saXN0PyhwLmxpc3Quc3BsaWNlKHAuaW5kZXgsMSkscC5saXN0Lmxlbmd0aHx8ZGVsZXRlIHRoaXMuZGF0YV9bcC5pZF0scC5lbnRyeS5wcmV2aW91cy5uZXh0PXAuZW50cnkubmV4dCxwLmVudHJ5Lm5leHQucHJldmlvdXM9cC5lbnRyeS5wcmV2aW91cyxwLmVudHJ5LmhlYWQ9bnVsbCx0aGlzLnNpemUtLSwhMCk6ITF9O3QucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy5kYXRhXz17fTt0aGlzLmhlYWRfPXRoaXMuaGVhZF8ucHJldmlvdXM9aCgpO3RoaXMuc2l6ZT0wfTt0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24ocCl7cmV0dXJuISFuKHRoaXMscCkuZW50cnl9O3QucHJvdG90eXBlLmdldD1mdW5jdGlvbihwKXtyZXR1cm4ocD1cbm4odGhpcyxwKS5lbnRyeSkmJnAudmFsdWV9O3QucHJvdG90eXBlLmVudHJpZXM9ZnVuY3Rpb24oKXtyZXR1cm4gbSh0aGlzLGZ1bmN0aW9uKHApe3JldHVybltwLmtleSxwLnZhbHVlXX0pfTt0LnByb3RvdHlwZS5rZXlzPWZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyxmdW5jdGlvbihwKXtyZXR1cm4gcC5rZXl9KX07dC5wcm90b3R5cGUudmFsdWVzPWZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyxmdW5jdGlvbihwKXtyZXR1cm4gcC52YWx1ZX0pfTt0LnByb3RvdHlwZS5mb3JFYWNoPWZ1bmN0aW9uKHAsbCl7Zm9yKHZhciBxPXRoaXMuZW50cmllcygpLHY7ISh2PXEubmV4dCgpKS5kb25lOyl2PXYudmFsdWUscC5jYWxsKGwsdlsxXSx2WzBdLHRoaXMpfTt0LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdPXQucHJvdG90eXBlLmVudHJpZXM7dmFyIHk9MDtyZXR1cm4gdH0sXCJlczZcIixcImVzM1wiKTtcbmcucG9seWZpbGwoXCJTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbihoLG0pe3ZhciBuPWcuY2hlY2tTdHJpbmdBcmdzKHRoaXMsaCxcImVuZHNXaXRoXCIpO2grPVwiXCI7dm9pZCAwPT09bSYmKG09bi5sZW5ndGgpO209TWF0aC5tYXgoMCxNYXRoLm1pbihtfDAsbi5sZW5ndGgpKTtmb3IodmFyIHQ9aC5sZW5ndGg7MDx0JiYwPG07KWlmKG5bLS1tXSE9aFstLXRdKXJldHVybiExO3JldHVybiAwPj10fX0sXCJlczZcIixcImVzM1wiKTtnLnBvbHlmaWxsKFwiTnVtYmVyLmlzTmFOXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbihoKXtyZXR1cm5cIm51bWJlclwiPT09dHlwZW9mIGgmJmlzTmFOKGgpfX0sXCJlczZcIixcImVzM1wiKTtcbmcucG9seWZpbGwoXCJPYmplY3QuZW50cmllc1wiLGZ1bmN0aW9uKGUpe3JldHVybiBlP2U6ZnVuY3Rpb24oaCl7dmFyIG09W10sbjtmb3IobiBpbiBoKWcub3ducyhoLG4pJiZtLnB1c2goW24saFtuXV0pO3JldHVybiBtfX0sXCJlczhcIixcImVzM1wiKTt2YXIgRz10aGlzO1xuZnVuY3Rpb24gSCgpe2Z1bmN0aW9uIGUoYSl7dGhpcy5vcHRzPXt9O3RoaXMuZGVmYXVsdHM9e307dGhpcy5tZXNzYWdlcz1PYmplY3QuYXNzaWduKHt9LHIpO3RoaXMucnVsZXM9e2FueTpTLGFycmF5OlQsYm9vbGVhbjpVLGNsYXNzOlYsY3VzdG9tOlcsY3VycmVuY3k6WCxkYXRlOlksZW1haWw6WixlbnVtOmFhLGVxdWFsOmJhLGZvcmJpZGRlbjpjYSxmdW5jdGlvbjpkYSxtdWx0aTpCLG51bWJlcjp2LG9iamVjdDpxLG9iamVjdElEOmwscmVjb3JkOnAsc3RyaW5nOnksdHVwbGU6eCx1cmw6dyx1dWlkOnQsbWFjOm4sbHVobjptfTt0aGlzLmFsaWFzZXM9e307dGhpcy5jYWNoZT1uZXcgTWFwO2lmKGEpe0EodGhpcy5vcHRzLGEpO2EuZGVmYXVsdHMmJkEodGhpcy5kZWZhdWx0cyxhLmRlZmF1bHRzKTtpZihhLm1lc3NhZ2VzKWZvcih2YXIgYiBpbiBhLm1lc3NhZ2VzKXRoaXMuYWRkTWVzc2FnZShiLGEubWVzc2FnZXNbYl0pO2lmKGEuYWxpYXNlcylmb3IodmFyIGMgaW4gYS5hbGlhc2VzKXRoaXMuYWxpYXMoYyxcbmEuYWxpYXNlc1tjXSk7aWYoYS5jdXN0b21SdWxlcylmb3IodmFyIGQgaW4gYS5jdXN0b21SdWxlcyl0aGlzLmFkZChkLGEuY3VzdG9tUnVsZXNbZF0pO2lmKGEucGx1Z2lucyl7YT1hLnBsdWdpbnM7aWYoIUFycmF5LmlzQXJyYXkoYSkpdGhyb3cgRXJyb3IoXCJQbHVnaW5zIHR5cGUgbXVzdCBiZSBhcnJheVwiKTthLmZvckVhY2godGhpcy5wbHVnaW4uYmluZCh0aGlzKSl9dGhpcy5vcHRzLmRlYnVnJiYoYT1mdW5jdGlvbihmKXtyZXR1cm4gZn0sXCJ1bmRlZmluZWRcIj09PXR5cGVvZiB3aW5kb3cmJihhPWgpLHRoaXMuX2Zvcm1hdHRlcj1hKX19ZnVuY3Rpb24gaChhKXtJfHwoST1OKCksTz17cGFyc2VyOlwiYmFiZWxcIix1c2VUYWJzOiExLHByaW50V2lkdGg6MTIwLHRyYWlsaW5nQ29tbWE6XCJub25lXCIsdGFiV2lkdGg6NCxzaW5nbGVRdW90ZTohMSxzZW1pOiEwLGJyYWNrZXRTcGFjaW5nOiEwfSxKPU4oKSxQPXtsYW5ndWFnZTpcImpzXCIsdGhlbWU6Si5mcm9tSnNvbih7a2V5d29yZDpbXCJ3aGl0ZVwiLFxuXCJib2xkXCJdLGJ1aWx0X2luOlwibWFnZW50YVwiLGxpdGVyYWw6XCJjeWFuXCIsbnVtYmVyOlwibWFnZW50YVwiLHJlZ2V4cDpcInJlZFwiLHN0cmluZzpbXCJ5ZWxsb3dcIixcImJvbGRcIl0sc3ltYm9sOlwicGxhaW5cIixjbGFzczpcImJsdWVcIixhdHRyOlwicGxhaW5cIixmdW5jdGlvbjpbXCJ3aGl0ZVwiLFwiYm9sZFwiXSx0aXRsZTpcInBsYWluXCIscGFyYW1zOlwiZ3JlZW5cIixjb21tZW50OlwiZ3JleVwifSl9KTthPUkuZm9ybWF0KGEsTyk7cmV0dXJuIEouaGlnaGxpZ2h0KGEsUCl9ZnVuY3Rpb24gbShhKXthLnNjaGVtYTthPWEubWVzc2FnZXM7cmV0dXJue3NvdXJjZTonXFxuXFx0XFx0XFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xcblxcdFxcdFxcdFxcdCcrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KSsnXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKVxcblxcdFxcdFxcdFxcdHZhbHVlID0gU3RyaW5nKHZhbHVlKTtcXG5cXG5cXHRcXHRcXHR2YWwgPSB2YWx1ZS5yZXBsYWNlKC9cXFxcRCsvZywgXCJcIik7XFxuXFxuXFx0XFx0XFx0dmFyIGFycmF5ID0gWzAsIDIsIDQsIDYsIDgsIDEsIDMsIDUsIDcsIDldO1xcblxcdFxcdFxcdHZhciBsZW4gPSB2YWwgPyB2YWwubGVuZ3RoIDogMCxcXG5cXHRcXHRcXHRcXHRiaXQgPSAxLFxcblxcdFxcdFxcdFxcdHN1bSA9IDA7XFxuXFx0XFx0XFx0d2hpbGUgKGxlbi0tKSB7XFxuXFx0XFx0XFx0XFx0c3VtICs9ICEoYml0IF49IDEpID8gcGFyc2VJbnQodmFsW2xlbl0sIDEwKSA6IGFycmF5W3ZhbFtsZW5dXTtcXG5cXHRcXHRcXHR9XFxuXFxuXFx0XFx0XFx0aWYgKCEoc3VtICUgMTAgPT09IDAgJiYgc3VtID4gMCkpIHtcXG5cXHRcXHRcXHRcXHQnK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJsdWhuXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFxuXFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFwifX1mdW5jdGlvbiBuKGEpe2Euc2NoZW1hO2E9YS5tZXNzYWdlcztyZXR1cm57c291cmNlOidcXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XFxuXFx0XFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ1wiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXG5cXHRcXHRcXHR2YXIgdiA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XFxuXFx0XFx0XFx0aWYgKCFcIitlYS50b1N0cmluZygpK1wiLnRlc3QodikpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm1hY1wiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFxcdFxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHRcIn19ZnVuY3Rpb24gdChhKXt2YXIgYj1cbmEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcblxcdFxcdHZhciB2YWwgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xcblxcdFxcdGlmICghXCIrZmEudG9TdHJpbmcoKStcIi50ZXN0KHZhbCkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInV1aWRcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFxuXFx0XFx0Y29uc3QgdmVyc2lvbiA9IHZhbC5jaGFyQXQoMTQpIHwgMDtcXG5cXHRcIik7Nz5wYXJzZUludChiLnZlcnNpb24pJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoXCIrYi52ZXJzaW9uK1wiICE9PSB2ZXJzaW9uKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ1dWlkVmVyc2lvblwiLFxuZXhwZWN0ZWQ6Yi52ZXJzaW9uLGFjdHVhbDpcInZlcnNpb25cIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtjLnB1c2goJ1xcblxcdFxcdHN3aXRjaCAodmVyc2lvbikge1xcblxcdFxcdGNhc2UgMDpcXG5cXHRcXHRjYXNlIDE6XFxuXFx0XFx0Y2FzZSAyOlxcblxcdFxcdGNhc2UgNjpcXG5cXHRcXHRcXHRicmVhaztcXG5cXHRcXHRjYXNlIDM6XFxuXFx0XFx0Y2FzZSA0OlxcblxcdFxcdGNhc2UgNTpcXG5cXHRcXHRcXHRpZiAoW1wiOFwiLCBcIjlcIiwgXCJhXCIsIFwiYlwiXS5pbmRleE9mKHZhbC5jaGFyQXQoMTkpKSA9PT0gLTEpIHtcXG5cXHRcXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwidXVpZFwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzb3VyY2U6Yy5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB3KGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHQnK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFx0XCIpO2IuZW1wdHk/Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlO1xcblxcdFxcdFwiKTpjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ1cmxFbXB0eVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0aWYgKCFcIitoYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ1cmxcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzb3VyY2U6Yy5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB4KGEsXG5iLGMpe3ZhciBkPWEuc2NoZW1hLGY9YS5tZXNzYWdlczthPVtdO2lmKG51bGwhPWQuaXRlbXMpe2lmKCFBcnJheS5pc0FycmF5KGQuaXRlbXMpKXRocm93IEVycm9yKFwiSW52YWxpZCAnXCIrZC50eXBlK1wiJyBzY2hlbWEuIFRoZSAnaXRlbXMnIGZpZWxkIG11c3QgYmUgYW4gYXJyYXkuXCIpO2lmKDA9PT1kLml0ZW1zLmxlbmd0aCl0aHJvdyBFcnJvcihcIkludmFsaWQgJ1wiK2QudHlwZStcIicgc2NoZW1hLiBUaGUgJ2l0ZW1zJyBmaWVsZCBtdXN0IG5vdCBiZSBhbiBlbXB0eSBhcnJheS5cIik7fWEucHVzaChcIlxcblxcdFxcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInR1cGxlXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcblxcdFxcdHZhciBsZW4gPSB2YWx1ZS5sZW5ndGg7XFxuXFx0XCIpOyExPT09ZC5lbXB0eSYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ0dXBsZUVtcHR5XCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtpZihudWxsIT1kLml0ZW1zKXthLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoXCIrZC5lbXB0eStcIiAhPT0gZmFsc2UgJiYgbGVuID09PSAwKSB7XFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXG5cXHRcXHRcXHRpZiAobGVuICE9PSBcIitkLml0ZW1zLmxlbmd0aCtcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwidHVwbGVMZW5ndGhcIixleHBlY3RlZDpkLml0ZW1zLmxlbmd0aCxhY3R1YWw6XCJsZW5cIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTthLnB1c2goXCJcXG5cXHRcXHRcXHR2YXIgYXJyID0gdmFsdWU7XFxuXFx0XFx0XFx0dmFyIHBhcmVudEZpZWxkID0gZmllbGQ7XFxuXFx0XFx0XCIpO2ZvcihmPTA7ZjxkLml0ZW1zLmxlbmd0aDtmKyspe2EucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gYXJyW1wiK1xuZitcIl07XFxuXFx0XFx0XCIpO3ZhciBrPWIrXCJbXCIrZitcIl1cIix1PXRoaXMuZ2V0UnVsZUZyb21TY2hlbWEoZC5pdGVtc1tmXSk7YS5wdXNoKHRoaXMuY29tcGlsZVJ1bGUodSxjLGssXCJcXG5cXHRcXHRcXHRhcnJbXCIrZitcIl0gPSBcIisoYy5hc3luYz9cImF3YWl0IFwiOlwiXCIpK1wiY29udGV4dC5mblslJUlOREVYJSVdKGFycltcIitmKyddLCAocGFyZW50RmllbGQgPyBwYXJlbnRGaWVsZCA6IFwiXCIpICsgXCJbXCIgKyAnK2YrJyArIFwiXVwiLCBwYXJlbnQsIGVycm9ycywgY29udGV4dCk7XFxuXFx0XFx0JyxcImFycltcIitmK1wiXVwiKSl9YS5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIGFycjtcXG5cXHRcIil9ZWxzZSBhLnB1c2goXCJcXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzb3VyY2U6YS5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB5KGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXSxkPSExOyEwPT09Yi5jb252ZXJ0JiYoZD0hMCxjLnB1c2goJ1xcblxcdFxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XFxuXFx0XFx0XFx0fVxcblxcdFxcdCcpKTtcbmMucHVzaCgnXFxuXFx0XFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xcblxcdFxcdFxcdCcrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFxuXFx0XFx0dmFyIG9yaWdWYWx1ZSA9IHZhbHVlO1xcblxcdFwiKTtiLnRyaW0mJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudHJpbSgpO1xcblxcdFxcdFwiKSk7Yi50cmltTGVmdCYmKGQ9ITAsYy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFsdWUgPSB2YWx1ZS50cmltTGVmdCgpO1xcblxcdFxcdFwiKSk7Yi50cmltUmlnaHQmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudHJpbVJpZ2h0KCk7XFxuXFx0XFx0XCIpKTtiLnBhZFN0YXJ0JiYoZD0hMCxjLnB1c2goXCJcXG5cXHRcXHRcXHR2YWx1ZSA9IHZhbHVlLnBhZFN0YXJ0KFwiK2IucGFkU3RhcnQrXCIsIFwiK0pTT04uc3RyaW5naWZ5KG51bGwhPWIucGFkQ2hhcj9iLnBhZENoYXI6XCIgXCIpK1xuXCIpO1xcblxcdFxcdFwiKSk7Yi5wYWRFbmQmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUucGFkRW5kKFwiK2IucGFkRW5kK1wiLCBcIitKU09OLnN0cmluZ2lmeShudWxsIT1iLnBhZENoYXI/Yi5wYWRDaGFyOlwiIFwiKStcIik7XFxuXFx0XFx0XCIpKTtiLmxvd2VyY2FzZSYmKGQ9ITAsYy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFsdWUgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xcblxcdFxcdFwiKSk7Yi51cHBlcmNhc2UmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudG9VcHBlckNhc2UoKTtcXG5cXHRcXHRcIikpO2IubG9jYWxlTG93ZXJjYXNlJiYoZD0hMCxjLnB1c2goXCJcXG5cXHRcXHRcXHR2YWx1ZSA9IHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCk7XFxuXFx0XFx0XCIpKTtiLmxvY2FsZVVwcGVyY2FzZSYmKGQ9ITAsYy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFsdWUgPSB2YWx1ZS50b0xvY2FsZVVwcGVyQ2FzZSgpO1xcblxcdFxcdFwiKSk7Yy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFyIGxlbiA9IHZhbHVlLmxlbmd0aDtcXG5cXHRcIik7XG4hMT09PWIuZW1wdHk/Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nRW1wdHlcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik6ITA9PT1iLmVtcHR5JiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAobGVuID09PSAwKSB7XFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Yi5taW4mJmMucHVzaChcIlxcblxcdFxcdFxcdGlmIChsZW4gPCBcIitiLm1pbitcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nTWluXCIsZXhwZWN0ZWQ6Yi5taW4sYWN0dWFsOlwibGVuXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1iLm1heCYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA+IFwiK2IubWF4K1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdNYXhcIixleHBlY3RlZDpiLm1heCxhY3R1YWw6XCJsZW5cIixcbm1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Yi5sZW5ndGgmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmIChsZW4gIT09IFwiK2IubGVuZ3RoK1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdMZW5ndGhcIixleHBlY3RlZDpiLmxlbmd0aCxhY3R1YWw6XCJsZW5cIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO2lmKG51bGwhPWIucGF0dGVybil7dmFyIGY9Yi5wYXR0ZXJuO1wic3RyaW5nXCI9PXR5cGVvZiBiLnBhdHRlcm4mJihmPW5ldyBSZWdFeHAoYi5wYXR0ZXJuLGIucGF0dGVybkZsYWdzKSk7Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKCFcIitmLnRvU3RyaW5nKCkrXCIudGVzdCh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ1BhdHRlcm5cIixleHBlY3RlZDonXCInK2YudG9TdHJpbmcoKS5yZXBsYWNlKC9cIi9nLFwiXFxcXCQmXCIpKydcIicsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKX1udWxsIT1cbmIuY29udGFpbnMmJmMucHVzaCgnXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmluZGV4T2YoXCInK2IuY29udGFpbnMrJ1wiKSA9PT0gLTEpIHtcXG5cXHRcXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nQ29udGFpbnNcIixleHBlY3RlZDonXCInK2IuY29udGFpbnMrJ1wiJyxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO251bGwhPWIuZW51bSYmKGY9SlNPTi5zdHJpbmdpZnkoYi5lbnVtKSxjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoXCIrZitcIi5pbmRleE9mKHZhbHVlKSA9PT0gLTEpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ0VudW1cIixleHBlY3RlZDonXCInK2IuZW51bS5qb2luKFwiLCBcIikrJ1wiJyxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpKTshMD09PWIubnVtZXJpYyYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKCFcIitpYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpICkge1xcblxcdFxcdFxcdFxcdFwiK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdOdW1lcmljXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIuYWxwaGEmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmKCFcIitqYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdBbHBoYVwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7ITA9PT1iLmFscGhhbnVtJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZighXCIra2EudG9TdHJpbmcoKStcIi50ZXN0KHZhbHVlKSkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nQWxwaGFudW1cIixhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpOyEwPT09Yi5hbHBoYWRhc2gmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmKCFcIitsYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XFx0XCIrXG50aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ0FscGhhZGFzaFwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7ITA9PT1iLmhleCYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYodmFsdWUubGVuZ3RoICUgMiAhPT0gMCB8fCAhXCIrbWEudG9TdHJpbmcoKStcIi50ZXN0KHZhbHVlKSkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nSGV4XCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIuc2luZ2xlTGluZSYmYy5wdXNoKCdcXG5cXHRcXHRcXHRpZih2YWx1ZS5pbmNsdWRlcyhcIlxcXFxuXCIpKSB7XFxuXFx0XFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ1NpbmdsZUxpbmVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpOyEwPT09Yi5iYXNlNjQmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmKCFcIituYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XFx0XCIrXG50aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ0Jhc2U2NFwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gcChhLGIsYyl7dmFyIGQ9YS5zY2hlbWEsZj1bXTtmLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgdmFsdWUgPT09IG51bGwgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwicmVjb3JkXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphLm1lc3NhZ2VzfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcdFwiKTthPWQua2V5fHxcInN0cmluZ1wiO2Q9ZC52YWx1ZXx8XCJhbnlcIjtmLnB1c2goXCJcXG5cXHRcXHRjb25zdCByZWNvcmQgPSB2YWx1ZTtcXG5cXHRcXHRsZXQgc2FuaXRpemVkS2V5LCBzYW5pdGl6ZWRWYWx1ZTtcXG5cXHRcXHRjb25zdCByZXN1bHQgPSB7fTtcXG5cXHRcXHRmb3IgKGxldCBrZXkgaW4gdmFsdWUpIHtcXG5cXHRcIik7XG5mLnB1c2goXCJzYW5pdGl6ZWRLZXkgPSB2YWx1ZSA9IGtleTtcIik7YT10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGEpO2Zvcih2YXIgayBpbiBhLm1lc3NhZ2VzKWsuc3RhcnRzV2l0aChcInN0cmluZ1wiKSYmKGEubWVzc2FnZXNba109YS5tZXNzYWdlc1trXS5yZXBsYWNlKFwiIGZpZWxkIFwiLFwiIGtleSBcIikpO2YucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGEsYyxudWxsLFwiXFxuXFx0XFx0c2FuaXRpemVkS2V5ID0gXCIrKGMuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKSsnY29udGV4dC5mblslJUlOREVYJSVdKGtleSwgZmllbGQgPyBmaWVsZCArIFwiLlwiICsga2V5IDoga2V5LCByZWNvcmQsIGVycm9ycywgY29udGV4dCk7XFxuXFx0JyxcInNhbml0aXplZEtleVwiKSk7Zi5wdXNoKFwic2FuaXRpemVkVmFsdWUgPSB2YWx1ZSA9IHJlY29yZFtrZXldO1wiKTtrPXRoaXMuZ2V0UnVsZUZyb21TY2hlbWEoZCk7Zi5wdXNoKHRoaXMuY29tcGlsZVJ1bGUoayxjLGIrXCJba2V5XVwiLFwiXFxuXFx0XFx0c2FuaXRpemVkVmFsdWUgPSBcIisoYy5hc3luYz9cblwiYXdhaXQgXCI6XCJcIikrJ2NvbnRleHQuZm5bJSVJTkRFWCUlXSh2YWx1ZSwgZmllbGQgPyBmaWVsZCArIFwiLlwiICsga2V5IDoga2V5LCByZWNvcmQsIGVycm9ycywgY29udGV4dCk7XFxuXFx0JyxcInNhbml0aXplZFZhbHVlXCIpKTtmLnB1c2goXCJyZXN1bHRbc2FuaXRpemVkS2V5XSA9IHNhbml0aXplZFZhbHVlO1wiKTtmLnB1c2goXCJcXG5cXHRcXHR9XFxuXFx0XCIpO2YucHVzaChcInJldHVybiByZXN1bHQ7XCIpO3JldHVybntzb3VyY2U6Zi5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBsKGEsYixjKXtiPWEuc2NoZW1hO3ZhciBkPWEubWVzc2FnZXM7YT1hLmluZGV4O3ZhciBmPVtdO2MuY3VzdG9tc1thXT9jLmN1c3RvbXNbYV0uc2NoZW1hPWI6Yy5jdXN0b21zW2FdPXtzY2hlbWE6Yn07Zi5wdXNoKFwiXFxuXFx0XFx0Y29uc3QgT2JqZWN0SUQgPSBjb250ZXh0LmN1c3RvbXNbXCIrYStcIl0uc2NoZW1hLk9iamVjdElEO1xcblxcdFxcdGlmICghT2JqZWN0SUQuaXNWYWxpZCh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm9iamVjdElEXCIsXG5hY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmR9KStcIlxcblxcdFxcdFxcdHJldHVybjtcXG5cXHRcXHR9XFxuXFx0XCIpOyEwPT09Yi5jb252ZXJ0P2YucHVzaChcInJldHVybiBuZXcgT2JqZWN0SUQodmFsdWUpXCIpOlwiaGV4U3RyaW5nXCI9PT1iLmNvbnZlcnQ/Zi5wdXNoKFwicmV0dXJuIHZhbHVlLnRvU3RyaW5nKClcIik6Zi5wdXNoKFwicmV0dXJuIHZhbHVlXCIpO3JldHVybntzb3VyY2U6Zi5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBxKGEsYixjKXt2YXIgZD10aGlzLGY9YS5zY2hlbWE7YT1hLm1lc3NhZ2VzO3ZhciBrPVtdO2sucHVzaCgnXFxuXFx0XFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCB2YWx1ZSA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xcblxcdFxcdFxcdCcrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJvYmplY3RcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFx0XCIpO3ZhciB1PWYucHJvcGVydGllc3x8Zi5wcm9wcztcbmlmKHUpe2sucHVzaChcInZhciBwYXJlbnRPYmogPSB2YWx1ZTtcIik7ay5wdXNoKFwidmFyIHBhcmVudEZpZWxkID0gZmllbGQ7XCIpO2Zvcih2YXIgej1PYmplY3Qua2V5cyh1KS5maWx0ZXIoZnVuY3Rpb24ob2Epe3JldHVybiFkLmlzTWV0YUtleShvYSl9KSxDPTA7Qzx6Lmxlbmd0aDtDKyspe3ZhciBEPXpbQ10sRT1LKEQpLFE9cGEudGVzdChFKT9cIi5cIitFOlwiWydcIitFK1wiJ11cIixMPVwicGFyZW50T2JqXCIrUSxSPShiP2IrXCIuXCI6XCJcIikrRCxGPXVbRF0ubGFiZWw7Rj1GP1wiJ1wiK0soRikrXCInXCI6dm9pZCAwO2sucHVzaChcIlxcbi8vIEZpZWxkOiBcIitLKFIpKTtrLnB1c2goJ2ZpZWxkID0gcGFyZW50RmllbGQgPyBwYXJlbnRGaWVsZCArIFwiJytRKydcIiA6IFwiJytFKydcIjsnKTtrLnB1c2goXCJ2YWx1ZSA9IFwiK0wrXCI7XCIpO2sucHVzaChcImxhYmVsID0gXCIrRik7RD10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKHVbRF0pO2sucHVzaCh0aGlzLmNvbXBpbGVSdWxlKEQsYyxSLFwiXFxuXFx0XFx0XFx0XFx0XCIrTCtcIiA9IFwiK1xuKGMuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKStcImNvbnRleHQuZm5bJSVJTkRFWCUlXSh2YWx1ZSwgZmllbGQsIHBhcmVudE9iaiwgZXJyb3JzLCBjb250ZXh0LCBsYWJlbCk7XFxuXFx0XFx0XFx0XCIsTCkpOyEwPT09dGhpcy5vcHRzLmhhbHRPbkZpcnN0RXJyb3ImJmsucHVzaChcImlmIChlcnJvcnMubGVuZ3RoKSByZXR1cm4gcGFyZW50T2JqO1wiKX1mLnN0cmljdCYmKGI9T2JqZWN0LmtleXModSksay5wdXNoKFwiXFxuXFx0XFx0XFx0XFx0ZmllbGQgPSBwYXJlbnRGaWVsZDtcXG5cXHRcXHRcXHRcXHR2YXIgaW52YWxpZFByb3BzID0gW107XFxuXFx0XFx0XFx0XFx0dmFyIHByb3BzID0gT2JqZWN0LmtleXMocGFyZW50T2JqKTtcXG5cXG5cXHRcXHRcXHRcXHRmb3IgKGxldCBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XFxuXFx0XFx0XFx0XFx0XFx0aWYgKFwiK0pTT04uc3RyaW5naWZ5KGIpK1wiLmluZGV4T2YocHJvcHNbaV0pID09PSAtMSkge1xcblxcdFxcdFxcdFxcdFxcdFxcdGludmFsaWRQcm9wcy5wdXNoKHByb3BzW2ldKTtcXG5cXHRcXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdFxcdGlmIChpbnZhbGlkUHJvcHMubGVuZ3RoKSB7XFxuXFx0XFx0XFx0XCIpLFxuXCJyZW1vdmVcIj09PWYuc3RyaWN0PyhrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHRpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiKSxrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHRcXHRpbnZhbGlkUHJvcHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xcblxcdFxcdFxcdFxcdFxcdFxcdFxcdGRlbGV0ZSBwYXJlbnRPYmpbZmllbGRdO1xcblxcdFxcdFxcdFxcdFxcdFxcdH0pO1xcblxcdFxcdFxcdFxcdFwiKSxrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0XFx0XCIpKTprLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm9iamVjdFN0cmljdFwiLGV4cGVjdGVkOidcIicrYi5qb2luKFwiLCBcIikrJ1wiJyxhY3R1YWw6XCJpbnZhbGlkUHJvcHMuam9pbignLCAnKVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdFxcdFwiKSxrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0XCIpKX1pZihudWxsIT1mLm1pblByb3BzfHxudWxsIT1mLm1heFByb3BzKWYuc3RyaWN0P2sucHVzaChcIlxcblxcdFxcdFxcdFxcdHByb3BzID0gT2JqZWN0LmtleXMoXCIrXG4odT9cInBhcmVudE9ialwiOlwidmFsdWVcIikrXCIpO1xcblxcdFxcdFxcdFwiKTprLnB1c2goXCJcXG5cXHRcXHRcXHRcXHR2YXIgcHJvcHMgPSBPYmplY3Qua2V5cyhcIisodT9cInBhcmVudE9ialwiOlwidmFsdWVcIikrXCIpO1xcblxcdFxcdFxcdFxcdFwiKyh1P1wiZmllbGQgPSBwYXJlbnRGaWVsZDtcIjpcIlwiKStcIlxcblxcdFxcdFxcdFwiKTtudWxsIT1mLm1pblByb3BzJiZrLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAocHJvcHMubGVuZ3RoIDwgXCIrZi5taW5Qcm9wcytcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwib2JqZWN0TWluUHJvcHNcIixleHBlY3RlZDpmLm1pblByb3BzLGFjdHVhbDpcInByb3BzLmxlbmd0aFwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Zi5tYXhQcm9wcyYmay5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHByb3BzLmxlbmd0aCA+IFwiK2YubWF4UHJvcHMrXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm9iamVjdE1heFByb3BzXCIsZXhwZWN0ZWQ6Zi5tYXhQcm9wcyxhY3R1YWw6XCJwcm9wcy5sZW5ndGhcIixcbm1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7dT9rLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gcGFyZW50T2JqO1xcblxcdFxcdFwiKTprLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XCIpO3JldHVybntzb3VyY2U6ay5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB2KGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goXCJcXG5cXHRcXHR2YXIgb3JpZ1ZhbHVlID0gdmFsdWU7XFxuXFx0XCIpO3ZhciBkPSExOyEwPT09Yi5jb252ZXJ0JiYoZD0hMCxjLnB1c2goJ1xcblxcdFxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwibnVtYmVyXCIpIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XFxuXFx0XFx0XFx0fVxcblxcdFxcdCcpKTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwibnVtYmVyXCIgfHwgaXNOYU4odmFsdWUpIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwibnVtYmVyXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsXG5tZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcdFwiKTtudWxsIT1iLm1pbiYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlIDwgXCIrYi5taW4rXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm51bWJlck1pblwiLGV4cGVjdGVkOmIubWluLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Yi5tYXgmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSA+IFwiK2IubWF4K1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJNYXhcIixleHBlY3RlZDpiLm1heCxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO251bGwhPWIuZXF1YWwmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSAhPT0gXCIrYi5lcXVhbCtcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwibnVtYmVyRXF1YWxcIixleHBlY3RlZDpiLmVxdWFsLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLFxubWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1iLm5vdEVxdWFsJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUgPT09IFwiK2Iubm90RXF1YWwrXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm51bWJlck5vdEVxdWFsXCIsZXhwZWN0ZWQ6Yi5ub3RFcXVhbCxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpOyEwPT09Yi5pbnRlZ2VyJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUgJSAxICE9PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJJbnRlZ2VyXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIucG9zaXRpdmUmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSA8PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJQb3NpdGl2ZVwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcblwiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIubmVnYXRpdmUmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSA+PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJOZWdhdGl2ZVwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gQihhLGIsYyl7dmFyIGQ9YS5zY2hlbWE7YS5tZXNzYWdlczthPVtdO2EucHVzaChcIlxcblxcdFxcdHZhciBoYXNWYWxpZCA9IGZhbHNlO1xcblxcdFxcdHZhciBuZXdWYWwgPSB2YWx1ZTtcXG5cXHRcXHR2YXIgY2hlY2tFcnJvcnMgPSBbXTtcXG5cXHRcXHR2YXIgZXJyb3JzU2l6ZSA9IGVycm9ycy5sZW5ndGg7XFxuXFx0XCIpO2Zvcih2YXIgZj0wO2Y8ZC5ydWxlcy5sZW5ndGg7ZisrKXthLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoIWhhc1ZhbGlkKSB7XFxuXFx0XFx0XFx0XFx0dmFyIF9lcnJvcnMgPSBbXTtcXG5cXHRcXHRcIik7XG52YXIgaz10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGQucnVsZXNbZl0pO2EucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGssYyxiLFwidmFyIHRtcFZhbCA9IFwiKyhjLmFzeW5jP1wiYXdhaXQgXCI6XCJcIikrXCJjb250ZXh0LmZuWyUlSU5ERVglJV0odmFsdWUsIGZpZWxkLCBwYXJlbnQsIF9lcnJvcnMsIGNvbnRleHQpO1wiLFwidG1wVmFsXCIpKTthLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRpZiAoZXJyb3JzLmxlbmd0aCA9PSBlcnJvcnNTaXplICYmIF9lcnJvcnMubGVuZ3RoID09IDApIHtcXG5cXHRcXHRcXHRcXHRcXHRoYXNWYWxpZCA9IHRydWU7XFxuXFx0XFx0XFx0XFx0XFx0bmV3VmFsID0gdG1wVmFsO1xcblxcdFxcdFxcdFxcdH0gZWxzZSB7XFxuXFx0XFx0XFx0XFx0XFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoY2hlY2tFcnJvcnMsIFtdLmNvbmNhdChfZXJyb3JzLCBlcnJvcnMuc3BsaWNlKGVycm9yc1NpemUpKSk7XFxuXFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIil9YS5wdXNoKFwiXFxuXFx0XFx0aWYgKCFoYXNWYWxpZCkge1xcblxcdFxcdFxcdEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGVycm9ycywgY2hlY2tFcnJvcnMpO1xcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gbmV3VmFsO1xcblxcdFwiKTtcbnJldHVybntzb3VyY2U6YS5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBkYShhKXthLnNjaGVtYTtyZXR1cm57c291cmNlOidcXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpXFxuXFx0XFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcImZ1bmN0aW9uXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphLm1lc3NhZ2VzfSkrXCJcXG5cXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XCJ9fWZ1bmN0aW9uIGNhKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goXCJcXG5cXHRcXHRpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xcblxcdFwiKTtiLnJlbW92ZT9jLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gdW5kZWZpbmVkO1xcblxcdFxcdFwiKTpjLnB1c2goXCJcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImZvcmJpZGRlblwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XCIpO2MucHVzaChcIlxcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO1xucmV0dXJue3NvdXJjZTpjLmpvaW4oXCJcXG5cIil9fWZ1bmN0aW9uIGJhKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtiLmZpZWxkPyhiLnN0cmljdD9jLnB1c2goJ1xcblxcdFxcdFxcdFxcdGlmICh2YWx1ZSAhPT0gcGFyZW50W1wiJytiLmZpZWxkKydcIl0pXFxuXFx0XFx0XFx0Jyk6Yy5wdXNoKCdcXG5cXHRcXHRcXHRcXHRpZiAodmFsdWUgIT0gcGFyZW50W1wiJytiLmZpZWxkKydcIl0pXFxuXFx0XFx0XFx0JyksYy5wdXNoKFwiXFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJlcXVhbEZpZWxkXCIsYWN0dWFsOlwidmFsdWVcIixleHBlY3RlZDpKU09OLnN0cmluZ2lmeShiLmZpZWxkKSxtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcIikpOihiLnN0cmljdD9jLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRpZiAodmFsdWUgIT09IFwiK0pTT04uc3RyaW5naWZ5KGIudmFsdWUpK1wiKVxcblxcdFxcdFxcdFwiKTpjLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRpZiAodmFsdWUgIT0gXCIrSlNPTi5zdHJpbmdpZnkoYi52YWx1ZSkrXCIpXFxuXFx0XFx0XFx0XCIpLFxuYy5wdXNoKFwiXFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJlcXVhbFZhbHVlXCIsYWN0dWFsOlwidmFsdWVcIixleHBlY3RlZDpKU09OLnN0cmluZ2lmeShiLnZhbHVlKSxtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcIikpO2MucHVzaChcIlxcblxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcIik7cmV0dXJue3NvdXJjZTpjLmpvaW4oXCJcXG5cIil9fWZ1bmN0aW9uIGFhKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlcztyZXR1cm57c291cmNlOlwiXFxuXFx0XFx0XFx0aWYgKFwiK0pTT04uc3RyaW5naWZ5KGIudmFsdWVzfHxbXSkrXCIuaW5kZXhPZih2YWx1ZSkgPT09IC0xKVxcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiZW51bVZhbHVlXCIsZXhwZWN0ZWQ6J1wiJytiLnZhbHVlcy5qb2luKFwiLCBcIikrJ1wiJyxhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdFxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHRcIn19ZnVuY3Rpb24gWihhKXt2YXIgYj1hLnNjaGVtYTthPWEubWVzc2FnZXM7XG52YXIgYz1bXSxkPVwicHJlY2lzZVwiPT1iLm1vZGU/cWE6cmEsZj0hMTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcdFwiKTtiLmVtcHR5P2MucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZTtcXG5cXHRcXHRcIik6Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiZW1haWxFbXB0eVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yi5ub3JtYWxpemUmJihmPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XFxuXFx0XFx0XCIpKTtudWxsIT1cbmIubWluJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUubGVuZ3RoIDwgXCIrYi5taW4rXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImVtYWlsTWluXCIsZXhwZWN0ZWQ6Yi5taW4sYWN0dWFsOlwidmFsdWUubGVuZ3RoXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1iLm1heCYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmxlbmd0aCA+IFwiK2IubWF4K1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJlbWFpbE1heFwiLGV4cGVjdGVkOmIubWF4LGFjdHVhbDpcInZhbHVlLmxlbmd0aFwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0aWYgKCFcIitkLnRvU3RyaW5nKCkrXCIudGVzdCh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImVtYWlsXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHR9XFxuXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmYsXG5zb3VyY2U6Yy5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBZKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXSxkPSExO2MucHVzaChcIlxcblxcdFxcdHZhciBvcmlnVmFsdWUgPSB2YWx1ZTtcXG5cXHRcIik7ITA9PT1iLmNvbnZlcnQmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IG5ldyBEYXRlKHZhbHVlLmxlbmd0aCAmJiAhaXNOYU4oK3ZhbHVlKSA/ICt2YWx1ZSA6IHZhbHVlKTtcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpKTtjLnB1c2goXCJcXG5cXHRcXHRpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHx8IGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpXFxuXFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJkYXRlXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gWChhKXt2YXIgYj1cbmEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1iLmN1cnJlbmN5U3ltYm9sfHxudWxsLGQ9Yi50aG91c2FuZFNlcGFyYXRvcnx8XCIsXCIsZj1iLmRlY2ltYWxTZXBhcmF0b3J8fFwiLlwiLGs9Yi5jdXN0b21SZWdleDtiPSFiLnN5bWJvbE9wdGlvbmFsO2I9XCIoPz0uKlxcXFxkKV4oLT9+MXx+MS0/KSgoWzAtOV1cXFxcZHswLDJ9KH4yXFxcXGR7M30pKil8MCk/KFxcXFx+M1xcXFxkezEsMn0pPyRcIi5yZXBsYWNlKC9+MS9nLGM/XCJcXFxcXCIrYysoYj9cIlwiOlwiP1wiKTpcIlwiKS5yZXBsYWNlKFwifjJcIixkKS5yZXBsYWNlKFwifjNcIixmKTtjPVtdO2MucHVzaChcIlxcblxcdFxcdGlmICghdmFsdWUubWF0Y2goXCIrKGt8fG5ldyBSZWdFeHAoYikpK1wiKSkge1xcblxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiY3VycmVuY3lcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gVyhhLFxuYixjKXt2YXIgZD1bXTtkLnB1c2goXCJcXG5cXHRcXHRcIit0aGlzLm1ha2VDdXN0b21WYWxpZGF0b3Ioe2ZuTmFtZTpcImNoZWNrXCIscGF0aDpiLHNjaGVtYTphLnNjaGVtYSxtZXNzYWdlczphLm1lc3NhZ2VzLGNvbnRleHQ6YyxydWxlSW5kZXg6YS5pbmRleH0pK1wiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c291cmNlOmQuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gVihhLGIsYyl7Yj1hLnNjaGVtYTt2YXIgZD1hLm1lc3NhZ2VzO2E9YS5pbmRleDt2YXIgZj1bXSxrPWIuaW5zdGFuY2VPZi5uYW1lP2IuaW5zdGFuY2VPZi5uYW1lOlwiPFVua25vd0NsYXNzPlwiO2MuY3VzdG9tc1thXT9jLmN1c3RvbXNbYV0uc2NoZW1hPWI6Yy5jdXN0b21zW2FdPXtzY2hlbWE6Yn07Zi5wdXNoKFwiXFxuXFx0XFx0aWYgKCEodmFsdWUgaW5zdGFuY2VvZiBjb250ZXh0LmN1c3RvbXNbXCIrYStcIl0uc2NoZW1hLmluc3RhbmNlT2YpKVxcblxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiY2xhc3NJbnN0YW5jZU9mXCIsXG5hY3R1YWw6XCJ2YWx1ZVwiLGV4cGVjdGVkOlwiJ1wiK2srXCInXCIsbWVzc2FnZXM6ZH0pK1wiXFxuXFx0XCIpO2YucHVzaChcIlxcblxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcIik7cmV0dXJue3NvdXJjZTpmLmpvaW4oXCJcXG5cIil9fWZ1bmN0aW9uIFUoYSl7dmFyIGI9YS5zY2hlbWE7YT1hLm1lc3NhZ2VzO3ZhciBjPVtdLGQ9ITE7Yy5wdXNoKFwiXFxuXFx0XFx0dmFyIG9yaWdWYWx1ZSA9IHZhbHVlO1xcblxcdFwiKTshMD09PWIuY29udmVydCYmKGQ9ITAsYy5wdXNoKCdcXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcImJvb2xlYW5cIikge1xcblxcdFxcdFxcdFxcdGlmIChcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9PT0gMVxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcInRydWVcIlxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcIjFcIlxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcIm9uXCJcXG5cXHRcXHRcXHRcXHQpIHtcXG5cXHRcXHRcXHRcXHRcXHR2YWx1ZSA9IHRydWU7XFxuXFx0XFx0XFx0XFx0fSBlbHNlIGlmIChcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9PT0gMFxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcImZhbHNlXCJcXG5cXHRcXHRcXHRcXHR8fCB2YWx1ZSA9PT0gXCIwXCJcXG5cXHRcXHRcXHRcXHR8fCB2YWx1ZSA9PT0gXCJvZmZcIlxcblxcdFxcdFxcdFxcdCkge1xcblxcdFxcdFxcdFxcdFxcdHZhbHVlID0gZmFsc2U7XFxuXFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdH1cXG5cXHRcXHQnKSk7XG5jLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwiYm9vbGVhblwiKSB7XFxuXFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcImJvb2xlYW5cIixhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHR9XFxuXFx0XFx0XFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gVChhLGIsYyl7dmFyIGQ9YS5zY2hlbWEsZj1hLm1lc3NhZ2VzO2E9W107dmFyIGs9ITE7ITA9PT1kLmNvbnZlcnQmJihrPSEwLGEucHVzaChcIlxcblxcdFxcdFxcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUgIT0gbnVsbCkge1xcblxcdFxcdFxcdFxcdHZhbHVlID0gW3ZhbHVlXTtcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpKTthLnB1c2goXCJcXG5cXHRcXHRpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XFxuXFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJhcnJheVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdH1cXG5cXG5cXHRcXHR2YXIgbGVuID0gdmFsdWUubGVuZ3RoO1xcblxcdFwiKTtcbiExPT09ZC5lbXB0eSYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlFbXB0eVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1kLm1pbiYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA8IFwiK2QubWluK1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJhcnJheU1pblwiLGV4cGVjdGVkOmQubWluLGFjdHVhbDpcImxlblwiLG1lc3NhZ2VzOmZ9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9ZC5tYXgmJmEucHVzaChcIlxcblxcdFxcdFxcdGlmIChsZW4gPiBcIitkLm1heCtcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlNYXhcIixleHBlY3RlZDpkLm1heCxhY3R1YWw6XCJsZW5cIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO251bGwhPWQubGVuZ3RoJiZhLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAobGVuICE9PSBcIitkLmxlbmd0aCtcblwiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJhcnJheUxlbmd0aFwiLGV4cGVjdGVkOmQubGVuZ3RoLGFjdHVhbDpcImxlblwiLG1lc3NhZ2VzOmZ9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9ZC5jb250YWlucyYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmluZGV4T2YoXCIrSlNPTi5zdHJpbmdpZnkoZC5jb250YWlucykrXCIpID09PSAtMSkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlDb250YWluc1wiLGV4cGVjdGVkOkpTT04uc3RyaW5naWZ5KGQuY29udGFpbnMpLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWQudW5pcXVlJiZhLnB1c2goXCJcXG5cXHRcXHRcXHRpZihsZW4gPiAobmV3IFNldCh2YWx1ZSkpLnNpemUpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImFycmF5VW5pcXVlXCIsZXhwZWN0ZWQ6XCJBcnJheS5mcm9tKG5ldyBTZXQodmFsdWUuZmlsdGVyKChpdGVtLCBpbmRleCkgPT4gdmFsdWUuaW5kZXhPZihpdGVtKSAhPT0gaW5kZXgpKSlcIixcbmFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtpZihudWxsIT1kLmVudW0pe3ZhciB1PUpTT04uc3RyaW5naWZ5KGQuZW51bSk7YS5wdXNoKFwiXFxuXFx0XFx0XFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xcblxcdFxcdFxcdFxcdGlmIChcIit1K1wiLmluZGV4T2YodmFsdWVbaV0pID09PSAtMSkge1xcblxcdFxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlFbnVtXCIsZXhwZWN0ZWQ6J1wiJytkLmVudW0uam9pbihcIiwgXCIpKydcIicsYWN0dWFsOlwidmFsdWVbaV1cIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKX1udWxsIT1kLml0ZW1zPyhhLnB1c2goXCJcXG5cXHRcXHRcXHR2YXIgYXJyID0gdmFsdWU7XFxuXFx0XFx0XFx0dmFyIHBhcmVudEZpZWxkID0gZmllbGQ7XFxuXFx0XFx0XFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IGFycltpXTtcXG5cXHRcXHRcIiksYis9XG5cIltdXCIsZD10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGQuaXRlbXMpLGEucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGQsYyxiLFwiYXJyW2ldID0gXCIrKGMuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKSsnY29udGV4dC5mblslJUlOREVYJSVdKGFycltpXSwgKHBhcmVudEZpZWxkID8gcGFyZW50RmllbGQgOiBcIlwiKSArIFwiW1wiICsgaSArIFwiXVwiLCBwYXJlbnQsIGVycm9ycywgY29udGV4dCknLFwiYXJyW2ldXCIpKSxhLnB1c2goXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpLGEucHVzaChcIlxcblxcdFxcdHJldHVybiBhcnI7XFxuXFx0XCIpKTphLnB1c2goXCJcXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzYW5pdGl6ZWQ6ayxzb3VyY2U6YS5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBTKCl7dmFyIGE9W107YS5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c291cmNlOmEuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gc2EoYSxiLGMpe3JldHVybiBhLnJlcGxhY2UoYix2b2lkIDA9PT1jfHxudWxsPT09Yz9cIlwiOlwiZnVuY3Rpb25cIj09PVxudHlwZW9mIGMudG9TdHJpbmc/Yzp0eXBlb2YgYyl9ZnVuY3Rpb24gQShhLGIsYyl7dm9pZCAwPT09YyYmKGM9e30pO2Zvcih2YXIgZCBpbiBiKXt2YXIgZj1iW2RdO2Y9XCJvYmplY3RcIiE9PXR5cGVvZiBmfHxBcnJheS5pc0FycmF5KGYpfHxudWxsPT1mPyExOjA8T2JqZWN0LmtleXMoZikubGVuZ3RoO2lmKGYpYVtkXT1hW2RdfHx7fSxBKGFbZF0sYltkXSxjKTtlbHNlIGlmKCEwIT09Yy5za2lwSWZFeGlzdHx8dm9pZCAwPT09YVtkXSlhW2RdPWJbZF19cmV0dXJuIGF9ZnVuY3Rpb24gSyhhKXtyZXR1cm4gYS5yZXBsYWNlKHRhLGZ1bmN0aW9uKGIpe3N3aXRjaChiKXtjYXNlICdcIic6Y2FzZSBcIidcIjpjYXNlIFwiXFxcXFwiOnJldHVyblwiXFxcXFwiK2I7Y2FzZSBcIlxcblwiOnJldHVyblwiXFxcXG5cIjtjYXNlIFwiXFxyXCI6cmV0dXJuXCJcXFxcclwiO2Nhc2UgXCJcXHUyMDI4XCI6cmV0dXJuXCJcXFxcdTIwMjhcIjtjYXNlIFwiXFx1MjAyOVwiOnJldHVyblwiXFxcXHUyMDI5XCJ9fSl9ZnVuY3Rpb24gTigpe3Rocm93IEVycm9yKFwiRHluYW1pYyByZXF1aXJlcyBhcmUgbm90IGN1cnJlbnRseSBzdXBwb3J0ZWQgYnkgcm9sbHVwLXBsdWdpbi1jb21tb25qc1wiKTtcbn12YXIgcj17cmVxdWlyZWQ6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGlzIHJlcXVpcmVkLlwiLHN0cmluZzpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHN0cmluZy5cIixzdHJpbmdFbXB0eTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBub3QgYmUgZW1wdHkuXCIsc3RyaW5nTWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfSBjaGFyYWN0ZXJzIGxvbmcuXCIsc3RyaW5nTWF4OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfSBjaGFyYWN0ZXJzIGxvbmcuXCIsc3RyaW5nTGVuZ3RoOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSB7ZXhwZWN0ZWR9IGNoYXJhY3RlcnMgbG9uZy5cIixzdHJpbmdQYXR0ZXJuOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBmYWlscyB0byBtYXRjaCB0aGUgcmVxdWlyZWQgcGF0dGVybi5cIixzdHJpbmdDb250YWluczpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBjb250YWluIHRoZSAne2V4cGVjdGVkfScgdGV4dC5cIixcbnN0cmluZ0VudW06XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGRvZXMgbm90IG1hdGNoIGFueSBvZiB0aGUgYWxsb3dlZCB2YWx1ZXMuXCIsc3RyaW5nTnVtZXJpYzpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIG51bWVyaWMgc3RyaW5nLlwiLHN0cmluZ0FscGhhOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFscGhhYmV0aWMgc3RyaW5nLlwiLHN0cmluZ0FscGhhbnVtOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFscGhhbnVtZXJpYyBzdHJpbmcuXCIsc3RyaW5nQWxwaGFkYXNoOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFscGhhZGFzaCBzdHJpbmcuXCIsc3RyaW5nSGV4OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgaGV4IHN0cmluZy5cIixzdHJpbmdTaW5nbGVMaW5lOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgc2luZ2xlIGxpbmUgc3RyaW5nLlwiLHN0cmluZ0Jhc2U2NDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIGJhc2U2NCBzdHJpbmcuXCIsXG5udW1iZXI6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSBudW1iZXIuXCIsbnVtYmVyTWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLG51bWJlck1heDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfS5cIixudW1iZXJFcXVhbDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLG51bWJlck5vdEVxdWFsOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBjYW4ndCBiZSBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLG51bWJlckludGVnZXI6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gaW50ZWdlci5cIixudW1iZXJQb3NpdGl2ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlci5cIixudW1iZXJOZWdhdGl2ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIG5lZ2F0aXZlIG51bWJlci5cIixcbmFycmF5OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFycmF5LlwiLGFycmF5RW1wdHk6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3Qgbm90IGJlIGFuIGVtcHR5IGFycmF5LlwiLGFycmF5TWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGNvbnRhaW4gYXQgbGVhc3Qge2V4cGVjdGVkfSBpdGVtcy5cIixhcnJheU1heDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBjb250YWluIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9IGl0ZW1zLlwiLGFycmF5TGVuZ3RoOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGNvbnRhaW4ge2V4cGVjdGVkfSBpdGVtcy5cIixhcnJheUNvbnRhaW5zOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGNvbnRhaW4gdGhlICd7ZXhwZWN0ZWR9JyBpdGVtLlwiLGFycmF5VW5pcXVlOlwiVGhlICd7YWN0dWFsfScgdmFsdWUgaW4gJ3tmaWVsZH0nIGZpZWxkIGRvZXMgbm90IHVuaXF1ZSB0aGUgJ3tleHBlY3RlZH0nIHZhbHVlcy5cIixhcnJheUVudW06XCJUaGUgJ3thY3R1YWx9JyB2YWx1ZSBpbiAne2ZpZWxkfScgZmllbGQgZG9lcyBub3QgbWF0Y2ggYW55IG9mIHRoZSAne2V4cGVjdGVkfScgdmFsdWVzLlwiLFxudHVwbGU6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gYXJyYXkuXCIsdHVwbGVFbXB0eTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBub3QgYmUgYW4gZW1wdHkgYXJyYXkuXCIsdHVwbGVMZW5ndGg6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgY29udGFpbiB7ZXhwZWN0ZWR9IGl0ZW1zLlwiLGJvb2xlYW46XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSBib29sZWFuLlwiLGN1cnJlbmN5OlwiVGhlICd7ZmllbGR9JyBtdXN0IGJlIGEgdmFsaWQgY3VycmVuY3kgZm9ybWF0XCIsZGF0ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIERhdGUuXCIsZGF0ZU1pbjpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfS5cIixkYXRlTWF4OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLGVudW1WYWx1ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgdmFsdWUgJ3tleHBlY3RlZH0nIGRvZXMgbm90IG1hdGNoIGFueSBvZiB0aGUgYWxsb3dlZCB2YWx1ZXMuXCIsXG5lcXVhbFZhbHVlOlwiVGhlICd7ZmllbGR9JyBmaWVsZCB2YWx1ZSBtdXN0IGJlIGVxdWFsIHRvICd7ZXhwZWN0ZWR9Jy5cIixlcXVhbEZpZWxkOlwiVGhlICd7ZmllbGR9JyBmaWVsZCB2YWx1ZSBtdXN0IGJlIGVxdWFsIHRvICd7ZXhwZWN0ZWR9JyBmaWVsZCB2YWx1ZS5cIixmb3JiaWRkZW46XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGlzIGZvcmJpZGRlbi5cIixmdW5jdGlvbjpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiLGVtYWlsOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgdmFsaWQgZS1tYWlsLlwiLGVtYWlsRW1wdHk6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3Qgbm90IGJlIGVtcHR5LlwiLGVtYWlsTWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfSBjaGFyYWN0ZXJzIGxvbmcuXCIsZW1haWxNYXg6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGxlbmd0aCBtdXN0IGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9IGNoYXJhY3RlcnMgbG9uZy5cIixcbmx1aG46XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSB2YWxpZCBjaGVja3N1bSBsdWhuLlwiLG1hYzpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIE1BQyBhZGRyZXNzLlwiLG9iamVjdDpcIlRoZSAne2ZpZWxkfScgbXVzdCBiZSBhbiBPYmplY3QuXCIsb2JqZWN0U3RyaWN0OlwiVGhlIG9iamVjdCAne2ZpZWxkfScgY29udGFpbnMgZm9yYmlkZGVuIGtleXM6ICd7YWN0dWFsfScuXCIsb2JqZWN0TWluUHJvcHM6XCJUaGUgb2JqZWN0ICd7ZmllbGR9JyBtdXN0IGNvbnRhaW4gYXQgbGVhc3Qge2V4cGVjdGVkfSBwcm9wZXJ0aWVzLlwiLG9iamVjdE1heFByb3BzOlwiVGhlIG9iamVjdCAne2ZpZWxkfScgbXVzdCBjb250YWluIHtleHBlY3RlZH0gcHJvcGVydGllcyBhdCBtb3N0LlwiLHVybDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVSTC5cIix1cmxFbXB0eTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBub3QgYmUgZW1wdHkuXCIsdXVpZDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVVSUQuXCIsXG51dWlkVmVyc2lvbjpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVVSUQgdmVyc2lvbiBwcm92aWRlZC5cIixjbGFzc0luc3RhbmNlT2Y6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgdGhlICd7ZXhwZWN0ZWR9JyBjbGFzcy5cIixvYmplY3RJRDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhbiB2YWxpZCBPYmplY3RJRFwiLHJlY29yZDpcIlRoZSAne2ZpZWxkfScgbXVzdCBiZSBhbiBPYmplY3QuXCJ9O3IucmVxdWlyZWQ7ci5zdHJpbmc7ci5zdHJpbmdFbXB0eTtyLnN0cmluZ01pbjtyLnN0cmluZ01heDtyLnN0cmluZ0xlbmd0aDtyLnN0cmluZ1BhdHRlcm47ci5zdHJpbmdDb250YWlucztyLnN0cmluZ0VudW07ci5zdHJpbmdOdW1lcmljO3Iuc3RyaW5nQWxwaGE7ci5zdHJpbmdBbHBoYW51bTtyLnN0cmluZ0FscGhhZGFzaDtyLnN0cmluZ0hleDtyLnN0cmluZ1NpbmdsZUxpbmU7ci5zdHJpbmdCYXNlNjQ7ci5udW1iZXI7ci5udW1iZXJNaW47XG5yLm51bWJlck1heDtyLm51bWJlckVxdWFsO3IubnVtYmVyTm90RXF1YWw7ci5udW1iZXJJbnRlZ2VyO3IubnVtYmVyUG9zaXRpdmU7ci5udW1iZXJOZWdhdGl2ZTtyLmFycmF5O3IuYXJyYXlFbXB0eTtyLmFycmF5TWluO3IuYXJyYXlNYXg7ci5hcnJheUxlbmd0aDtyLmFycmF5Q29udGFpbnM7ci5hcnJheVVuaXF1ZTtyLmFycmF5RW51bTtyLnR1cGxlO3IudHVwbGVFbXB0eTtyLnR1cGxlTGVuZ3RoO3IuY3VycmVuY3k7ci5kYXRlO3IuZGF0ZU1pbjtyLmRhdGVNYXg7ci5lbnVtVmFsdWU7ci5lcXVhbFZhbHVlO3IuZXF1YWxGaWVsZDtyLmZvcmJpZGRlbjtyLmVtYWlsO3IuZW1haWxFbXB0eTtyLmVtYWlsTWluO3IuZW1haWxNYXg7ci5sdWhuO3IubWFjO3Iub2JqZWN0O3Iub2JqZWN0U3RyaWN0O3Iub2JqZWN0TWluUHJvcHM7ci5vYmplY3RNYXhQcm9wcztyLnVybDtyLnVybEVtcHR5O3IudXVpZDtyLnV1aWRWZXJzaW9uO3IuY2xhc3NJbnN0YW5jZU9mO3Iub2JqZWN0SUQ7ci5yZWNvcmQ7XG52YXIgcWE9L14oKFtePD4oKVtcXF1cXFxcLiw7Olxcc0BcIl0rKFxcLltePD4oKVtcXF1cXFxcLiw7Olxcc0BcIl0rKSopfChcIi4rXCIpKUAoKFxcW1swLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXF0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvLHJhPS9eXFxTK0BcXFMrXFwuXFxTKyQvLHBhPS9eW18kYS16QS1aXVtfJGEtekEtWjAtOV0qJC8sdGE9L1tcIidcXFxcXFxuXFxyXFx1MjAyOFxcdTIwMjldL2csaWE9L14tP1swLTldXFxkKihcXC5cXGQrKT8kLyxqYT0vXlthLXpBLVpdKyQvLGthPS9eW2EtekEtWjAtOV0rJC8sbGE9L15bYS16QS1aMC05Xy1dKyQvLG1hPS9eWzAtOWEtZkEtRl0rJC8sbmE9L14oPzpbQS1aYS16MC05K1xcXFwvXXs0fSkqKD86W0EtWmEtejAtOStcXFxcL117Mn09PXxbQS1aYS16MC05Ky9dezN9PSk/JC8saGE9L15odHRwcz86XFwvXFwvXFxTKy8sZmE9L14oWzAtOWEtZl17OH0tWzAtOWEtZl17NH0tWzEtNl1bMC05YS1mXXszfS1bMC05YS1mXXs0fS1bMC05YS1mXXsxMn18WzBdezh9LVswXXs0fS1bMF17NH0tWzBdezR9LVswXXsxMn0pJC9pLFxuZWE9L14oKChbYS1mMC05XVthLWYwLTldK1stXSl7NX18KFthLWYwLTldW2EtZjAtOV0rWzpdKXs1fSkoW2EtZjAtOV1bYS1mMC05XSkkKXwoXihbYS1mMC05XVthLWYwLTldW2EtZjAtOV1bYS1mMC05XStbLl0pezJ9KFthLWYwLTldW2EtZjAtOV1bYS1mMC05XVthLWYwLTldKSkkL2ksSSxPLEosUDt0cnl7dmFyIE09KG5ldyBGdW5jdGlvbihcInJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXN5bmMgZnVuY3Rpb24oKXt9KS5jb25zdHJ1Y3RvclwiKSkoKX1jYXRjaChhKXt9ZS5wcm90b3R5cGUudmFsaWRhdGU9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5jb21waWxlKGIpKGEpfTtlLnByb3RvdHlwZS53cmFwUmVxdWlyZWRDaGVja1NvdXJjZUNvZGU9ZnVuY3Rpb24oYSxiLGMsZCl7dmFyIGY9W10saz10aGlzLm9wdHMuY29uc2lkZXJOdWxsQXNBVmFsdWU7dm9pZCAwPT09ayYmKGs9ITEpO3ZhciB1PSEwPT09YS5zY2hlbWEub3B0aW9uYWx8fFwiZm9yYmlkZGVuXCI9PT1hLnNjaGVtYS50eXBlLFxuej1rPyExIT09YS5zY2hlbWEubnVsbGFibGV8fFwiZm9yYmlkZGVuXCI9PT1hLnNjaGVtYS50eXBlOiEwPT09YS5zY2hlbWEub3B0aW9uYWx8fCEwPT09YS5zY2hlbWEubnVsbGFibGV8fFwiZm9yYmlkZGVuXCI9PT1hLnNjaGVtYS50eXBlOyhrP3ZvaWQgMCE9YS5zY2hlbWEuZGVmYXVsdCYmbnVsbCE9YS5zY2hlbWEuZGVmYXVsdDp2b2lkIDAhPWEuc2NoZW1hLmRlZmF1bHQpPyh1PSExLGs/ITE9PT1hLnNjaGVtYS5udWxsYWJsZSYmKHo9ITEpOiEwIT09YS5zY2hlbWEubnVsbGFibGUmJih6PSExKSxcImZ1bmN0aW9uXCI9PT10eXBlb2YgYS5zY2hlbWEuZGVmYXVsdD8oYy5jdXN0b21zW2EuaW5kZXhdfHwoYy5jdXN0b21zW2EuaW5kZXhdPXt9KSxjLmN1c3RvbXNbYS5pbmRleF0uZGVmYXVsdEZuPWEuc2NoZW1hLmRlZmF1bHQsYT1cImNvbnRleHQuY3VzdG9tc1tcIithLmluZGV4K1wiXS5kZWZhdWx0Rm4uY2FsbCh0aGlzLCBjb250ZXh0LnJ1bGVzW1wiK2EuaW5kZXgrXCJdLnNjaGVtYSwgZmllbGQsIHBhcmVudCwgY29udGV4dClcIik6XG5hPUpTT04uc3RyaW5naWZ5KGEuc2NoZW1hLmRlZmF1bHQpLGQ9XCJcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IFwiK2ErXCI7XFxuXFx0XFx0XFx0XFx0XCIrZCtcIiA9IHZhbHVlO1xcblxcdFxcdFxcdFwiKTpkPXRoaXMubWFrZUVycm9yKHt0eXBlOlwicmVxdWlyZWRcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmEubWVzc2FnZXN9KTtmLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgeyBcIisoKHU/XCJcXG4vLyBhbGxvdyB1bmRlZmluZWRcXG5cIjpkKStcIiB9XFxuXFx0XFx0XFx0ZWxzZSBpZiAodmFsdWUgPT09IG51bGwpIHsgXCIpKygoej9cIlxcbi8vIGFsbG93IG51bGxcXG5cIjpkKStcIiB9XFxuXFx0XFx0XFx0XCIpKyhiP1wiZWxzZSB7IFwiK2IrXCIgfVwiOlwiXCIpK1wiXFxuXFx0XFx0XCIpO3JldHVybiBmLmpvaW4oXCJcXG5cIil9O2UucHJvdG90eXBlLmlzTWV0YUtleT1mdW5jdGlvbihhKXtyZXR1cm4gYS5zdGFydHNXaXRoKFwiJCRcIil9O2UucHJvdG90eXBlLnJlbW92ZU1ldGFzS2V5cz1mdW5jdGlvbihhKXt2YXIgYj10aGlzO09iamVjdC5rZXlzKGEpLmZvckVhY2goZnVuY3Rpb24oYyl7Yi5pc01ldGFLZXkoYykmJlxuZGVsZXRlIGFbY119KX07ZS5wcm90b3R5cGUuY29tcGlsZT1mdW5jdGlvbihhKXtmdW5jdGlvbiBiKHUseil7ZC5kYXRhPXU7eiYmei5tZXRhJiYoZC5tZXRhPXoubWV0YSk7cmV0dXJuIGsuY2FsbChjLHUsZCl9aWYobnVsbD09PWF8fFwib2JqZWN0XCIhPT10eXBlb2YgYSl0aHJvdyBFcnJvcihcIkludmFsaWQgc2NoZW1hLlwiKTt2YXIgYz10aGlzLGQ9e2luZGV4OjAsYXN5bmM6ITA9PT1hLiQkYXN5bmMscnVsZXM6W10sZm46W10sY3VzdG9tczp7fSx1dGlsczp7cmVwbGFjZTpzYX19O3RoaXMuY2FjaGUuY2xlYXIoKTtkZWxldGUgYS4kJGFzeW5jO2lmKGQuYXN5bmMmJiFNKXRocm93IEVycm9yKFwiQXN5bmNocm9ub3VzIG1vZGUgaXMgbm90IHN1cHBvcnRlZC5cIik7aWYoITAhPT1hLiQkcm9vdClpZihBcnJheS5pc0FycmF5KGEpKWE9dGhpcy5nZXRSdWxlRnJvbVNjaGVtYShhKS5zY2hlbWE7ZWxzZXt2YXIgZj1PYmplY3QuYXNzaWduKHt9LGEpO2E9e3R5cGU6XCJvYmplY3RcIixzdHJpY3Q6Zi4kJHN0cmljdCxcbnByb3BlcnRpZXM6Zn07dGhpcy5yZW1vdmVNZXRhc0tleXMoZil9Zj1bXCJ2YXIgZXJyb3JzID0gW107XCIsXCJ2YXIgZmllbGQ7XCIsXCJ2YXIgcGFyZW50ID0gbnVsbDtcIixcInZhciBsYWJlbCA9IFwiKyhhLmxhYmVsPydcIicrYS5sYWJlbCsnXCInOlwibnVsbFwiKStcIjtcIl07YT10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGEpO2YucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGEsZCxudWxsLChkLmFzeW5jP1wiYXdhaXQgXCI6XCJcIikrXCJjb250ZXh0LmZuWyUlSU5ERVglJV0odmFsdWUsIGZpZWxkLCBudWxsLCBlcnJvcnMsIGNvbnRleHQsIGxhYmVsKTtcIixcInZhbHVlXCIpKTtmLnB1c2goXCJpZiAoZXJyb3JzLmxlbmd0aCkge1wiKTtmLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gZXJyb3JzLm1hcChlcnIgPT4ge1xcblxcdFxcdFxcdFxcdGlmIChlcnIubWVzc2FnZSkge1xcblxcdFxcdFxcdFxcdFxcdGVyci5tZXNzYWdlID0gY29udGV4dC51dGlscy5yZXBsYWNlKGVyci5tZXNzYWdlLCAvXFxcXHtmaWVsZFxcXFx9L2csIGVyci5sYWJlbCB8fCBlcnIuZmllbGQpO1xcblxcdFxcdFxcdFxcdFxcdGVyci5tZXNzYWdlID0gY29udGV4dC51dGlscy5yZXBsYWNlKGVyci5tZXNzYWdlLCAvXFxcXHtleHBlY3RlZFxcXFx9L2csIGVyci5leHBlY3RlZCk7XFxuXFx0XFx0XFx0XFx0XFx0ZXJyLm1lc3NhZ2UgPSBjb250ZXh0LnV0aWxzLnJlcGxhY2UoZXJyLm1lc3NhZ2UsIC9cXFxce2FjdHVhbFxcXFx9L2csIGVyci5hY3R1YWwpO1xcblxcdFxcdFxcdFxcdH1cXG5cXHRcXHRcXHRcXHRpZighZXJyLmxhYmVsKSBkZWxldGUgZXJyLmxhYmVsXFxuXFx0XFx0XFx0XFx0cmV0dXJuIGVycjtcXG5cXHRcXHRcXHR9KTtcXG5cXHRcXHRcIik7XG5mLnB1c2goXCJ9XCIpO2YucHVzaChcInJldHVybiB0cnVlO1wiKTthPWYuam9pbihcIlxcblwiKTt2YXIgaz1uZXcgKGQuYXN5bmM/TTpGdW5jdGlvbikoXCJ2YWx1ZVwiLFwiY29udGV4dFwiLGEpO3RoaXMub3B0cy5kZWJ1ZyYmY29uc29sZS5sb2codGhpcy5fZm9ybWF0dGVyKFwiLy8gTWFpbiBjaGVjayBmdW5jdGlvblxcblwiK2sudG9TdHJpbmcoKSkpO3RoaXMuY2FjaGUuY2xlYXIoKTtiLmFzeW5jPWQuYXN5bmM7cmV0dXJuIGJ9O2UucHJvdG90eXBlLmNvbXBpbGVSdWxlPWZ1bmN0aW9uKGEsYixjLGQsZil7dmFyIGs9W10sdT10aGlzLmNhY2hlLmdldChhLnNjaGVtYSk7dT8oYT11LGEuY3ljbGU9ITAsYS5jeWNsZVN0YWNrPVtdLGsucHVzaCh0aGlzLndyYXBSZXF1aXJlZENoZWNrU291cmNlQ29kZShhLFwiXFxuXFx0XFx0XFx0XFx0dmFyIHJ1bGUgPSBjb250ZXh0LnJ1bGVzW1wiK2EuaW5kZXgrXCJdO1xcblxcdFxcdFxcdFxcdGlmIChydWxlLmN5Y2xlU3RhY2suaW5kZXhPZih2YWx1ZSkgPT09IC0xKSB7XFxuXFx0XFx0XFx0XFx0XFx0cnVsZS5jeWNsZVN0YWNrLnB1c2godmFsdWUpO1xcblxcdFxcdFxcdFxcdFxcdFwiK1xuZC5yZXBsYWNlKC8lJUlOREVYJSUvZyxhLmluZGV4KStcIlxcblxcdFxcdFxcdFxcdFxcdHJ1bGUuY3ljbGVTdGFjay5wb3AodmFsdWUpO1xcblxcdFxcdFxcdFxcdH1cXG5cXHRcXHRcXHRcIixiLGYpKSk6KHRoaXMuY2FjaGUuc2V0KGEuc2NoZW1hLGEpLGEuaW5kZXg9Yi5pbmRleCxiLnJ1bGVzW2IuaW5kZXhdPWEsdT1udWxsIT1jP2M6XCIkJHJvb3RcIixiLmluZGV4KyssYz1hLnJ1bGVGdW5jdGlvbi5jYWxsKHRoaXMsYSxjLGIpLGMuc291cmNlPWMuc291cmNlLnJlcGxhY2UoLyUlSU5ERVglJS9nLGEuaW5kZXgpLGM9bmV3IChiLmFzeW5jP006RnVuY3Rpb24pKFwidmFsdWVcIixcImZpZWxkXCIsXCJwYXJlbnRcIixcImVycm9yc1wiLFwiY29udGV4dFwiLFwibGFiZWxcIixjLnNvdXJjZSksYi5mblthLmluZGV4XT1jLmJpbmQodGhpcyksay5wdXNoKHRoaXMud3JhcFJlcXVpcmVkQ2hlY2tTb3VyY2VDb2RlKGEsZC5yZXBsYWNlKC8lJUlOREVYJSUvZyxhLmluZGV4KSxiLGYpKSxrLnB1c2godGhpcy5tYWtlQ3VzdG9tVmFsaWRhdG9yKHt2TmFtZTpmLFxucGF0aDp1LHNjaGVtYTphLnNjaGVtYSxjb250ZXh0OmIsbWVzc2FnZXM6YS5tZXNzYWdlcyxydWxlSW5kZXg6YS5pbmRleH0pKSx0aGlzLm9wdHMuZGVidWcmJmNvbnNvbGUubG9nKHRoaXMuX2Zvcm1hdHRlcihcIi8vIENvbnRleHQuZm5bXCIrYS5pbmRleCtcIl1cXG5cIitjLnRvU3RyaW5nKCkpKSk7cmV0dXJuIGsuam9pbihcIlxcblwiKX07ZS5wcm90b3R5cGUuZ2V0UnVsZUZyb21TY2hlbWE9ZnVuY3Rpb24oYSl7YT10aGlzLnJlc29sdmVUeXBlKGEpO3ZhciBiPXRoaXMuYWxpYXNlc1thLnR5cGVdO2ImJihkZWxldGUgYS50eXBlLGE9QShhLGIse3NraXBJZkV4aXN0OiEwfSkpO2I9dGhpcy5ydWxlc1thLnR5cGVdO2lmKCFiKXRocm93IEVycm9yKFwiSW52YWxpZCAnXCIrYS50eXBlK1wiJyB0eXBlIGluIHZhbGlkYXRvciBzY2hlbWEuXCIpO3JldHVybnttZXNzYWdlczpPYmplY3QuYXNzaWduKHt9LHRoaXMubWVzc2FnZXMsYS5tZXNzYWdlcyksc2NoZW1hOkEoYSx0aGlzLmRlZmF1bHRzW2EudHlwZV0sXG57c2tpcElmRXhpc3Q6ITB9KSxydWxlRnVuY3Rpb246Yn19O2UucHJvdG90eXBlLnBhcnNlU2hvcnRIYW5kPWZ1bmN0aW9uKGEpe2E9YS5zcGxpdChcInxcIikubWFwKGZ1bmN0aW9uKGQpe3JldHVybiBkLnRyaW0oKX0pO3ZhciBiPWFbMF07dmFyIGM9Yi5lbmRzV2l0aChcIltdXCIpP3RoaXMuZ2V0UnVsZUZyb21TY2hlbWEoe3R5cGU6XCJhcnJheVwiLGl0ZW1zOmIuc2xpY2UoMCwtMil9KS5zY2hlbWE6e3R5cGU6YVswXX07YS5zbGljZSgxKS5tYXAoZnVuY3Rpb24oZCl7dmFyIGY9ZC5pbmRleE9mKFwiOlwiKTtpZigtMSE9PWYpe3ZhciBrPWQuc3Vic3RyKDAsZikudHJpbSgpO2Q9ZC5zdWJzdHIoZisxKS50cmltKCk7XCJ0cnVlXCI9PT1kfHxcImZhbHNlXCI9PT1kP2Q9XCJ0cnVlXCI9PT1kOk51bWJlci5pc05hTihOdW1iZXIoZCkpfHwoZD1OdW1iZXIoZCkpO2Nba109ZH1lbHNlIGQuc3RhcnRzV2l0aChcIm5vLVwiKT9jW2Quc2xpY2UoMyldPSExOmNbZF09ITB9KTtyZXR1cm4gY307ZS5wcm90b3R5cGUubWFrZUVycm9yPVxuZnVuY3Rpb24oYSl7dmFyIGI9YS50eXBlLGM9YS5maWVsZCxkPWEuZXhwZWN0ZWQsZj1hLmFjdHVhbCxrPXt0eXBlOidcIicrYisnXCInLG1lc3NhZ2U6J1wiJythLm1lc3NhZ2VzW2JdKydcIid9O2suZmllbGQ9Yz8nXCInK2MrJ1wiJzpcImZpZWxkXCI7bnVsbCE9ZCYmKGsuZXhwZWN0ZWQ9ZCk7bnVsbCE9ZiYmKGsuYWN0dWFsPWYpO2subGFiZWw9XCJsYWJlbFwiO3JldHVyblwiZXJyb3JzLnB1c2goeyBcIitPYmplY3Qua2V5cyhrKS5tYXAoZnVuY3Rpb24odSl7cmV0dXJuIHUrXCI6IFwiK2tbdV19KS5qb2luKFwiLCBcIikrXCIgfSk7XCJ9O2UucHJvdG90eXBlLm1ha2VDdXN0b21WYWxpZGF0b3I9ZnVuY3Rpb24oYSl7dmFyIGI9YS52TmFtZTt2b2lkIDA9PT1iJiYoYj1cInZhbHVlXCIpO3ZhciBjPWEuZm5OYW1lO3ZvaWQgMD09PWMmJihjPVwiY3VzdG9tXCIpO3ZhciBkPWEucnVsZUluZGV4LGY9YS5wYXRoLGs9YS5zY2hlbWEsdT1hLmNvbnRleHQsej1hLm1lc3NhZ2VzO2E9XCJydWxlXCIrZDt2YXIgQz1cImZuQ3VzdG9tRXJyb3JzXCIrXG5kO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGtbY10pe3UuY3VzdG9tc1tkXT8odS5jdXN0b21zW2RdLm1lc3NhZ2VzPXosdS5jdXN0b21zW2RdLnNjaGVtYT1rKTp1LmN1c3RvbXNbZF09e21lc3NhZ2VzOnosc2NoZW1hOmt9O2lmKHRoaXMub3B0cy51c2VOZXdDdXN0b21DaGVja2VyRnVuY3Rpb24pcmV0dXJuXCJcXG4gICAgICAgICAgICAgICBcXHRcXHRjb25zdCBcIithK1wiID0gY29udGV4dC5jdXN0b21zW1wiK2QrXCJdO1xcblxcdFxcdFxcdFxcdFxcdGNvbnN0IFwiK0MrXCIgPSBbXTtcXG5cXHRcXHRcXHRcXHRcXHRcIitiK1wiID0gXCIrKHUuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKSthK1wiLnNjaGVtYS5cIitjK1wiLmNhbGwodGhpcywgXCIrYitcIiwgXCIrQytcIiAsIFwiK2ErJy5zY2hlbWEsIFwiJytmKydcIiwgcGFyZW50LCBjb250ZXh0KTtcXG5cXHRcXHRcXHRcXHRcXHRpZiAoQXJyYXkuaXNBcnJheSgnK0MrXCIgKSkge1xcbiAgICAgICAgICAgICAgICAgIFxcdFxcdFwiK0MrXCIgLmZvckVhY2goZXJyID0+IGVycm9ycy5wdXNoKE9iamVjdC5hc3NpZ24oeyBtZXNzYWdlOiBcIitcbmErXCIubWVzc2FnZXNbZXJyLnR5cGVdLCBmaWVsZCB9LCBlcnIpKSk7XFxuXFx0XFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdFxcdFwiO2s9XCJyZXNfXCIrYTtyZXR1cm5cIlxcblxcdFxcdFxcdFxcdGNvbnN0IFwiK2ErXCIgPSBjb250ZXh0LmN1c3RvbXNbXCIrZCtcIl07XFxuXFx0XFx0XFx0XFx0Y29uc3QgXCIraytcIiA9IFwiKyh1LmFzeW5jP1wiYXdhaXQgXCI6XCJcIikrYStcIi5zY2hlbWEuXCIrYytcIi5jYWxsKHRoaXMsIFwiK2IrXCIsIFwiK2ErJy5zY2hlbWEsIFwiJytmKydcIiwgcGFyZW50LCBjb250ZXh0KTtcXG5cXHRcXHRcXHRcXHRpZiAoQXJyYXkuaXNBcnJheSgnK2srXCIpKSB7XFxuXFx0XFx0XFx0XFx0XFx0XCIraytcIi5mb3JFYWNoKGVyciA9PiBlcnJvcnMucHVzaChPYmplY3QuYXNzaWduKHsgbWVzc2FnZTogXCIrYStcIi5tZXNzYWdlc1tlcnIudHlwZV0sIGZpZWxkIH0sIGVycikpKTtcXG5cXHRcXHRcXHRcXHR9XFxuXFx0XFx0XCJ9cmV0dXJuXCJcIn07ZS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKGEsYil7dGhpcy5ydWxlc1thXT1ifTtlLnByb3RvdHlwZS5hZGRNZXNzYWdlPVxuZnVuY3Rpb24oYSxiKXt0aGlzLm1lc3NhZ2VzW2FdPWJ9O2UucHJvdG90eXBlLmFsaWFzPWZ1bmN0aW9uKGEsYil7aWYodGhpcy5ydWxlc1thXSl0aHJvdyBFcnJvcihcIkFsaWFzIG5hbWUgbXVzdCBub3QgYmUgYSBydWxlIG5hbWVcIik7dGhpcy5hbGlhc2VzW2FdPWJ9O2UucHJvdG90eXBlLnBsdWdpbj1mdW5jdGlvbihhKXtpZihcImZ1bmN0aW9uXCIhPT10eXBlb2YgYSl0aHJvdyBFcnJvcihcIlBsdWdpbiBmbiB0eXBlIG11c3QgYmUgZnVuY3Rpb25cIik7cmV0dXJuIGEodGhpcyl9O2UucHJvdG90eXBlLnJlc29sdmVUeXBlPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7aWYoXCJzdHJpbmdcIj09PXR5cGVvZiBhKWE9dGhpcy5wYXJzZVNob3J0SGFuZChhKTtlbHNlIGlmKEFycmF5LmlzQXJyYXkoYSkpe2lmKDA9PT1hLmxlbmd0aCl0aHJvdyBFcnJvcihcIkludmFsaWQgc2NoZW1hLlwiKTthPXt0eXBlOlwibXVsdGlcIixydWxlczphfTthLnJ1bGVzLm1hcChmdW5jdGlvbih1KXtyZXR1cm4gYi5nZXRSdWxlRnJvbVNjaGVtYSh1KX0pLmV2ZXJ5KGZ1bmN0aW9uKHUpe3JldHVybiEwPT09XG51LnNjaGVtYS5vcHRpb25hbH0pJiYoYS5vcHRpb25hbD0hMCk7dmFyIGM9dGhpcy5vcHRzLmNvbnNpZGVyTnVsbEFzQVZhbHVlPyExOiEwO2EucnVsZXMubWFwKGZ1bmN0aW9uKHUpe3JldHVybiBiLmdldFJ1bGVGcm9tU2NoZW1hKHUpfSkuZXZlcnkoZnVuY3Rpb24odSl7cmV0dXJuIHUuc2NoZW1hLm51bGxhYmxlPT09Y30pJiYoYS5udWxsYWJsZT1jKX1pZihhLiQkdHlwZSl7dmFyIGQ9dGhpcy5nZXRSdWxlRnJvbVNjaGVtYShhLiQkdHlwZSkuc2NoZW1hO2RlbGV0ZSBhLiQkdHlwZTt2YXIgZj1PYmplY3QuYXNzaWduKHt9LGEpLGs7Zm9yKGsgaW4gYSlkZWxldGUgYVtrXTtBKGEsZCx7c2tpcElmRXhpc3Q6ITB9KTthLnByb3BzPWZ9cmV0dXJuIGF9O2UucHJvdG90eXBlLm5vcm1hbGl6ZT1mdW5jdGlvbihhKXt2YXIgYj10aGlzLGM9dGhpcy5yZXNvbHZlVHlwZShhKTt0aGlzLmFsaWFzZXNbYy50eXBlXSYmKGM9QShjLHRoaXMubm9ybWFsaXplKHRoaXMuYWxpYXNlc1tjLnR5cGVdKSxcbntza2lwSWZFeGlzdHM6ITB9KSk7Yz1BKGMsdGhpcy5kZWZhdWx0c1tjLnR5cGVdLHtza2lwSWZFeGlzdDohMH0pO2lmKFwibXVsdGlcIj09PWMudHlwZSlyZXR1cm4gYy5ydWxlcz1jLnJ1bGVzLm1hcChmdW5jdGlvbihkKXtyZXR1cm4gYi5ub3JtYWxpemUoZCl9KSxjLm9wdGlvbmFsPWMucnVsZXMuZXZlcnkoZnVuY3Rpb24oZCl7cmV0dXJuITA9PT1kLm9wdGlvbmFsfSksYztpZihcImFycmF5XCI9PT1jLnR5cGUpcmV0dXJuIGMuaXRlbXM9dGhpcy5ub3JtYWxpemUoYy5pdGVtcyksYztcIm9iamVjdFwiPT09Yy50eXBlJiZjLnByb3BzJiZPYmplY3QuZW50cmllcyhjLnByb3BzKS5mb3JFYWNoKGZ1bmN0aW9uKGQpe3JldHVybiBjLnByb3BzW2RbMF1dPWIubm9ybWFsaXplKGRbMV0pfSk7XCJvYmplY3RcIj09PXR5cGVvZiBhJiYoYS50eXBlPyhhPXRoaXMubm9ybWFsaXplKGEudHlwZSksQShjLGEse3NraXBJZkV4aXN0czohMH0pKTpPYmplY3QuZW50cmllcyhhKS5mb3JFYWNoKGZ1bmN0aW9uKGQpe3JldHVybiBjW2RbMF1dPVxuYi5ub3JtYWxpemUoZFsxXSl9KSk7cmV0dXJuIGN9O3JldHVybiBlfVwib2JqZWN0XCI9PT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9SCgpOlwiZnVuY3Rpb25cIj09PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKEgpOihHPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgZ2xvYmFsVGhpcz9nbG9iYWxUaGlzOkd8fHNlbGYsRy5GYXN0ZXN0VmFsaWRhdG9yPUgoKSlcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuICpcbiAqIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG5leHBvcnQgbGV0IGVsZW1lbnRTY2hlbWEgPSB7XG4gIHR5cGU6ICdzdHJpbmcnLFxuICBvcHRpb25hbDogdHJ1ZSxcbiAgZGVmYXVsdDogJ2lucHV0JyxcbiAgbG93ZXJjYXNlOiB0cnVlLFxuICBlbnVtOiBbXG4gICAgJ2lucHV0JyxcbiAgICAndGV4dGFyZWEnLFxuICAgICdzZWxlY3QnLFxuICAgICdkaXYnLFxuICAgICdocicsXG4gICAgJ2JyJyxcbiAgICAnaDEnLFxuICAgICdoMicsXG4gICAgJ2gzJyxcbiAgICAnaDQnLFxuICAgICdoNScsXG4gICAgJ2g2JyxcbiAgXSxcbn07XG5cbmV4cG9ydCBsZXQgaW5wdXRUeXBlU2NoZW1hID0ge1xuICB0eXBlOiAnc3RyaW5nJyxcbiAgb3B0aW9uYWw6IHRydWUsXG4gIGRlZmF1bHQ6ICd0ZXh0JyxcbiAgbG93ZXJjYXNlOiB0cnVlLFxuICBlbnVtOiBbXG4gICAgJ2J1dHRvbicsXG4gICAgJ2NoZWNrYm94JyxcbiAgICAnY29sb3InLFxuICAgICdkYXRlJyxcbiAgICAnZGF0ZXRpbWUtbG9jYWwnLFxuICAgICdlbWFpbCcsXG4gICAgJ2ZpbGUnLFxuICAgICdoaWRkZW4nLFxuICAgICdpbWFnZScsXG4gICAgJ21vbnRoJyxcbiAgICAnbnVtYmVyJyxcbiAgICAncGFzc3dvcmQnLFxuICAgICdyYWRpbycsXG4gICAgJ3JhbmdlJyxcbiAgICAncmVzZXQnLFxuICAgICdzZWFyY2gnLFxuICAgICdzdWJtaXQnLFxuICAgICd0ZWwnLFxuICAgICd0ZXh0JyxcbiAgICAndGltZScsXG4gICAgJ3VybCcsXG4gICAgJ3dlZWsnLFxuICBdLFxufTtcblxuZXhwb3J0IGNvbnN0IGNvbnRyb2xTY2hlbWEgPSB7XG4gICQkcm9vdDogdHJ1ZSxcbiAgLy8gICAkJHN0cmljdDogJ3JlbW92ZScsXG5cbiAgdHlwZTogJ29iamVjdCcsXG4gIHByb3BzOiB7XG4gICAgZWxlbWVudDogZWxlbWVudFNjaGVtYSxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIHByb3BzOiB7XG4gICAgICAgIG5hbWU6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgdHlwZTogaW5wdXRUeXBlU2NoZW1hLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGxhYmVsOiB7XG4gICAgICB0eXBlOiAnbXVsdGknLFxuICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICBydWxlczogW1xuICAgICAgICB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICBwcm9wczoge1xuICAgICAgICAgICAgdGV4dDogJ3N0cmluZycsXG4gICAgICAgICAgICBjbGFzc2VzOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgIGl0ZW1zOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gICAgdmFsaWRhdGlvbjoge1xuICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgIHByb3BzOiB7XG4gICAgICAgIGVudW06IHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ3N0cmluZycgfSxcbiAgICAgICAgcmVxdWlyZWQ6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBsb3dlcmNhc2U6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBtaW46IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIG1heDogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgY29udGFpbnM6IHsgdHlwZTogJ2FueScsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIGVxdWFsOiB7IHR5cGU6ICdhbnknLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBub3RFcXVhbDogeyB0eXBlOiAnYW55Jywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgcG9zaXRpdmU6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBuZWdhdGl2ZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIGludGVnZXI6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBtaW5Qcm9wczogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUsIHBvc2l0aXZlOiB0cnVlIH0sXG4gICAgICAgIG1heFByb3BzOiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSwgcG9zaXRpdmU6IHRydWUgfSxcbiAgICAgICAgYWxwaGFudW06IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBhbHBoYWRhc2g6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBoZXg6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICBzaW5nbGVMaW5lOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgYmFzZTY0OiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgbG93ZXJjYXNlOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgdXBwZXJjYXNlOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgbG9jYWxlTG93ZXJjYXNlOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgbG9jYWxlVXBwZXJjYXNlOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgcGFkU3RhcnQ6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIHBhZEVuZDogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgcGFkU3RhcnQ6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIHRyaW1MZWZ0OiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgdHJpbVJpZ2h0OiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgdHJpbTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIG5vcm1hbGl6ZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgb3B0aW9uczoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgdHlwZTogJ211bHRpJyxcbiAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdhbnknIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBwcm9wczoge1xuICAgICAgICAgICAgICB0ZXh0OiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgdmFsdWU6ICdhbnknLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNoZWNrZWQ6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgIGNvbnRlbnQ6IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgY2xhc3NlczogeyB0eXBlOiAnYXJyYXknLCBkZWZhdWx0OiBbJ2NvbC1zbS0xMiddLCBvcHRpb25hbDogdHJ1ZSwgaXRlbXM6ICdzdHJpbmcnIH0sXG4gIH0sXG59O1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gKiBcbiAqIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG4vLyBpc3RhbmJ1bCBpZ25vcmUgbmV4dFxuY29uc3QgaXNPYmplY3QgPSBvYmogPT4ge1xuICBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGwpIHtcbiAgICBpZiAodHlwZW9mIE9iamVjdC5nZXRQcm90b3R5cGVPZiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25zdCBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKVxuICAgICAgcmV0dXJuIHByb3RvdHlwZSA9PT0gT2JqZWN0LnByb3RvdHlwZSB8fCBwcm90b3R5cGUgPT09IG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCJcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG5leHBvcnQgY29uc3QgbWVyZ2UgPSAoLi4ub2JqZWN0cykgPT5cbiAgb2JqZWN0cy5yZWR1Y2UoKHJlc3VsdCwgY3VycmVudCkgPT4ge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGN1cnJlbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBcIkFyZ3VtZW50cyBwcm92aWRlZCB0byB0cy1kZWVwbWVyZ2UgbXVzdCBiZSBvYmplY3RzLCBub3QgYXJyYXlzLlwiXG4gICAgICApXG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoY3VycmVudCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKFtcIl9fcHJvdG9fX1wiLCBcImNvbnN0cnVjdG9yXCIsIFwicHJvdG90eXBlXCJdLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdFtrZXldKSAmJiBBcnJheS5pc0FycmF5KGN1cnJlbnRba2V5XSkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZS5vcHRpb25zLm1lcmdlQXJyYXlzXG4gICAgICAgICAgPyBtZXJnZS5vcHRpb25zLnVuaXF1ZUFycmF5SXRlbXNcbiAgICAgICAgICAgID8gQXJyYXkuZnJvbShuZXcgU2V0KHJlc3VsdFtrZXldLmNvbmNhdChjdXJyZW50W2tleV0pKSlcbiAgICAgICAgICAgIDogWy4uLnJlc3VsdFtrZXldLCAuLi5jdXJyZW50W2tleV1dXG4gICAgICAgICAgOiBjdXJyZW50W2tleV1cbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QocmVzdWx0W2tleV0pICYmIGlzT2JqZWN0KGN1cnJlbnRba2V5XSkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZShyZXN1bHRba2V5XSwgY3VycmVudFtrZXldKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPVxuICAgICAgICAgIGN1cnJlbnRba2V5XSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IG1lcmdlLm9wdGlvbnMuYWxsb3dVbmRlZmluZWRPdmVycmlkZXNcbiAgICAgICAgICAgICAgPyBjdXJyZW50W2tleV1cbiAgICAgICAgICAgICAgOiByZXN1bHRba2V5XVxuICAgICAgICAgICAgOiBjdXJyZW50W2tleV1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9LCB7fSlcblxuY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGFsbG93VW5kZWZpbmVkT3ZlcnJpZGVzOiB0cnVlLFxuICBtZXJnZUFycmF5czogdHJ1ZSxcbiAgdW5pcXVlQXJyYXlJdGVtczogdHJ1ZVxufVxuXG5tZXJnZS5vcHRpb25zID0gZGVmYXVsdE9wdGlvbnNcblxubWVyZ2Uud2l0aE9wdGlvbnMgPSAob3B0aW9ucywgLi4ub2JqZWN0cykgPT4ge1xuICBtZXJnZS5vcHRpb25zID0ge1xuICAgIC4uLmRlZmF1bHRPcHRpb25zLFxuICAgIC4uLm9wdGlvbnNcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdCA9IG1lcmdlKC4uLm9iamVjdHMpXG5cbiAgbWVyZ2Uub3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zXG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gKlxuICogVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG5cbmV4cG9ydCBsZXQgZm9ybUlucHV0VHlwZXMgPSBbJ2lucHV0JywgJ3NlbGVjdCcsICd0ZXh0YXJlYSddO1xuXG5jb25zdCBtYWdpY1NwbGl0ID1cbiAgL15bYS16w6Atw7bDuC3Dv10rfFtBLVrDgC3DlsOYLcOfXVthLXrDoC3DtsO4LcO/XSt8W2EtesOgLcO2w7gtw79dK3xbMC05XSt8W0EtWsOALcOWw5gtw59dKyg/IVthLXrDoC3DtsO4LcO/XSkvZztcblxuLyoqXG4gKiBDYXBpdGFsaXNlcyBhIHNpbmdsZSB3b3JkXG4gKiBAcmV0dXJucyB0aGUgd29yZCB3aXRoIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gdXBwZXJjYXNlIGFuZCB0aGUgcmVzdCBpbiBsb3dlcmNhc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhcGl0YWxpc2VXb3JkKHN0cmluZykge1xuICBjb25zdCBtYXRjaCA9IHN0cmluZy5tYXRjaEFsbChtYWdpY1NwbGl0KS5uZXh0KCkudmFsdWU7XG4gIGNvbnN0IGZpcnN0TGV0dGVySW5kZXggPSBtYXRjaCA/IG1hdGNoLmluZGV4IDogMDtcbiAgcmV0dXJuIChcbiAgICBzdHJpbmcuc2xpY2UoMCwgZmlyc3RMZXR0ZXJJbmRleCArIDEpLnRvVXBwZXJDYXNlKCkgK1xuICAgIHN0cmluZy5zbGljZShmaXJzdExldHRlckluZGV4ICsgMSkudG9Mb3dlckNhc2UoKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGFiZWxUZXh0KGNvbnRyb2wpIHtcbiAgbGV0IGxhYmVsO1xuICBpZiAoY29udHJvbC5sYWJlbCkge1xuICAgIGxhYmVsID0gY29udHJvbC5sYWJlbC50ZXh0IHx8IGNvbnRyb2wubGFiZWw7XG4gIH0gZWxzZSB7XG4gICAgbGFiZWwgPSBjYXBpdGFsaXNlV29yZChjb250cm9sLmF0dHJpYnV0ZXMubmFtZSk7XG4gIH1cblxuICByZXR1cm4gbGFiZWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG59XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiAqXG4gKiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxuaW1wb3J0IFZhbGlkYXRvciBmcm9tICdmYXN0ZXN0LXZhbGlkYXRvcic7XG5pbXBvcnQgeyBjb250cm9sU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgbWVyZ2UgfSBmcm9tICcuL21lcmdlJztcbmltcG9ydCB7IGNsb25lLCBsYWJlbFRleHQsIGZvcm1JbnB1dFR5cGVzIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCB2ID0gbmV3IFZhbGlkYXRvcih7XG4gIG1lc3NhZ2VzOiB7XG4gICAgLy8gUmVnaXN0ZXIgb3VyIG5ldyBlcnJvciBtZXNzYWdlIHRleHRcbiAgICBjb2xvcjogXCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gZXZlbiBudW1iZXIhIEFjdHVhbDoge2FjdHVhbH1cIixcbiAgICBtb250aDogXCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSB2YWxpZCBtb250aCEgQWN0dWFsOiB7YWN0dWFsfVwiLFxuICAgIHRpbWU6IFwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgdmFsaWQgdGltZSEgQWN0dWFsOiB7YWN0dWFsfVwiLFxuICB9LFxufSk7XG5cbnYuYWRkKCdjb2xvcicsIGZ1bmN0aW9uICh7IHNjaGVtYSwgbWVzc2FnZXMgfSwgcGF0aCwgY29udGV4dCkge1xuICByZXR1cm4ge1xuICAgIHNvdXJjZTogYFxuICAgICAgICAgICAgZnVuY3Rpb24gaXNDb2xvcihzdHJDb2xvcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBuZXcgT3B0aW9uKCkuc3R5bGU7XG4gICAgICAgICAgICAgICAgcy5jb2xvciA9IHN0ckNvbG9yO1xuICAgICAgICAgICAgICAgIHJldHVybiBzLmNvbG9yICE9PSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICggIWlzQ29sb3IodmFsdWUpICl7XG4gICAgICAgICAgICAgICAgJHt0aGlzLm1ha2VFcnJvcih7IHR5cGU6ICdjb2xvcicsIGFjdHVhbDogJ3ZhbHVlJywgbWVzc2FnZXMgfSl9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgYCxcbiAgfTtcbn0pO1xuXG52LmFkZCgnbW9udGgnLCBmdW5jdGlvbiAoeyBzY2hlbWEsIG1lc3NhZ2VzIH0sIHBhdGgsIGNvbnRleHQpIHtcbiAgcmV0dXJuIHtcbiAgICBzb3VyY2U6IGAgICAgICAgIFxuICAgICAgICBsZXQgbW9udGhzID0gW10sIGQsIHM7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gMTE7IGkrKykge1xuICAgICAgICAgICAgZCA9IG5ldyBEYXRlKCkuc2V0TW9udGgoaSk7XG4gICAgICAgICAgICBzID0gbmV3IERhdGUoZCkudG9Mb2NhbGVTdHJpbmcoXCJlbi1VU1wiLCB7IG1vbnRoOiBcInNob3J0XCIgfSk7XG4gICAgICAgICAgICBtb250aHMucHVzaChcbiAgICAgICAgICAgICAgICBTdHJpbmcoaSArIDEpLFxuICAgICAgICAgICAgICAgIG5ldyBEYXRlKGQpLnRvTG9jYWxlU3RyaW5nKFwiZW4tVVNcIiwgeyBtb250aDogXCJsb25nXCIgfSkudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgICAgICBzLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc01vbnRoKG0pIHtcbiAgICAgICAgICAgIHJldHVybiBtb250aHMuaW5kZXhPZihTdHJpbmcobSkudG9Mb3dlckNhc2UoKSkgPiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggaXNNb250aCh2YWx1ZSk9PT1mYWxzZSApe1xuICAgICAgICAgICAgJHt0aGlzLm1ha2VFcnJvcih7IHR5cGU6ICdtb250aCcsIGFjdHVhbDogJ3ZhbHVlJywgbWVzc2FnZXMgfSl9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7YCxcbiAgfTtcbn0pO1xuXG52LmFkZCgndGltZScsIGZ1bmN0aW9uICh7IHNjaGVtYSwgbWVzc2FnZXMgfSwgcGF0aCwgY29udGV4dCkge1xuICByZXR1cm4ge1xuICAgIHNvdXJjZTogYCAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIGlzVGltZShzdHIpIHtcblxuICAgICAgICAgICAgbGV0IG51bVBhdCA9IC9eWzAtOV0rJC87XG4gICAgICAgICAgICBsZXQgbnVtUGF0QU1QTSA9IC9eKFtcXFxcLmFwbTAtOV0rKSQvaTtcbiAgICAgICAgICAgIGxldCBhcnIgPSBzdHIuc3BsaXQoLyg6fFxcXFxzKykvKS5maWx0ZXIoKHMpID0+IC9eW146XFxcXHNdKyQvLnRlc3QocykpO1xuICAgICAgICBcbiAgICAgICAgICAgIGlmIChudW1QYXQudGVzdChhcnJbMF0pID09PSBmYWxzZSB8fCBOdW1iZXIoYXJyWzBdKSA+PSAyMykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICBpZiAobnVtUGF0LnRlc3QoYXJyWzFdKSA9PT0gZmFsc2UgfHwgTnVtYmVyKGFyclsxXSkgPj0gNTkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgXG4gICAgICAgICAgICBpZiAoYXJyWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bVBhdEFNUE0udGVzdChhcnJbMl0pID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChudW1QYXQudGVzdChhcnJbMl0pICYmIE51bWJlcihhcnJbMl0pID49IDU5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhcnJbM10gJiYgbnVtUGF0QU1QTS50ZXN0KGFyclsyXSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBpc1RpbWUodmFsdWUpPT09ZmFsc2UgKXtcbiAgICAgICAgICAgICR7dGhpcy5tYWtlRXJyb3IoeyB0eXBlOiAndGltZScsIGFjdHVhbDogJ3ZhbHVlJywgbWVzc2FnZXMgfSl9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7YCxcbiAgfTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdmFsaWRhdGlvblR5cGVzID0ge1xuICBkYXRlOiAnZGF0ZScsXG4gICdkYXRldGltZS1sb2NhbCc6ICdkYXRlJyxcbiAgZW1haWw6ICdlbWFpbCcsXG4gIG51bWJlcjogJ251bWJlcicsXG4gIHVybDogJ3VybCcsXG4gIHBhc3N3b3JkOiAnc3RyaW5nJyxcbiAgdGV4dDogJ3N0cmluZycsXG4gIGNvbG9yOiAnY29sb3InLFxuICBtb250aDogJ21vbnRoJyxcbiAgdGltZTogJ3RpbWUnLFxuICAvLyBidXR0b246IFwiXCIsXG4gIC8vIGNoZWNrYm94OiBcIlwiLFxuICAvLyBmaWxlOiBcIlwiLFxuICAvLyBoaWRkZW46IFwiXCIsXG4gIC8vIGltYWdlOiBcIlwiLFxuICAvLyByYWRpbzogXCJcIixcbiAgLy8gcmFuZ2U6IFwiXCIsXG4gIC8vIHJlc2V0OiBcIlwiLFxuICAvLyBzZWFyY2g6IFwiXCIsXG4gIC8vIHN1Ym1pdDogXCJcIixcbiAgLy8gdGVsOiBcIlwiLFxuICAvLyB3ZWVrOiBcIlwiLFxufTtcblxuZnVuY3Rpb24gdmFsaWRhdGUodmFsLCBzY2hlbWEsIGVycm9yUHJlZml4ID0gJycsIHRocm93RXJyb3IgPSB0cnVlKSB7XG4gIGNvbnN0IGNoZWNrID0gdi5jb21waWxlKHNjaGVtYSk7XG4gIGNvbnN0IGlzVmFsaWQgPSBjaGVjayh2YWwpO1xuXG4gIGlmIChpc1ZhbGlkICE9PSB0cnVlKSB7XG4gICAgbGV0IG1lc3NhZ2UgPVxuICAgICAgJ1xcbicgKyBlcnJvclByZWZpeCArIGlzVmFsaWQubWFwKChvKSA9PiBvLm1lc3NhZ2UpLmpvaW4oJ1xcblxcdCcpO1xuICAgIGlmICh0aHJvd0Vycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lc3NhZ2U7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29udHJvbHMoY29udHJvbHMpIHtcbiAgbGV0IGlucHV0TmFtZXMgPSB7fTtcbiAgbGV0IGlucHV0SWRzID0ge307XG4gIGxldCBjb250cm9sO1xuXG4gIGZvciAobGV0IGkgaW4gY29udHJvbHMpIHtcbiAgICBpID0gTnVtYmVyKGkpO1xuXG4gICAgY29udHJvbCA9IGNvbnRyb2xzW2ldO1xuXG4gICAgbGV0IHNjaGVtYSA9IGNsb25lKGNvbnRyb2xTY2hlbWEpO1xuICAgIC8vIHJhZGlvICYgc2VsZWN0IGJveGVzIG11c3QgaGF2ZSBhbiBvcHRpb25zIGtleVxuICAgIGlmIChcbiAgICAgIGNvbnRyb2wuZWxlbWVudCA9PSAnc2VsZWN0JyB8fFxuICAgICAgKGNvbnRyb2wuZWxlbWVudCA9PSAnaW5wdXQnICYmIGNvbnRyb2wuYXR0cmlidXRlcy50eXBlID09ICdyYWRpbycpXG4gICAgKSB7XG4gICAgICBzY2hlbWEucHJvcHMub3B0aW9ucy5vcHRpb25hbCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGhpZGRlbiBmaWVsZHMgbXVzdCBoYXZlIGEgdmFsdWUgYXR0clxuICAgIGlmIChjb250cm9sLmVsZW1lbnQgPT0gJ2lucHV0JyAmJiBjb250cm9sLmF0dHJpYnV0ZXMudHlwZSA9PSAnaGlkZGVuJykge1xuICAgICAgc2NoZW1hLnByb3BzLmF0dHJpYnV0ZXMudmFsdWUgPSAnYW55JztcbiAgICB9XG5cbiAgICAvLyBpZiBub3QgY29udHJvbCxcbiAgICAvLyBuYW1lIG5hbWUgYXR0cmlidXRlIG9wdGlvbmFsXG4gICAgLy8gbWFrZSBjb250ZW50IGEgbXVzdFxuICAgIGlmIChmb3JtSW5wdXRUeXBlcy5pbmRleE9mKGNvbnRyb2wuZWxlbWVudCkgPT0gLTEpIHtcbiAgICAgIHNjaGVtYS5wcm9wcy5hdHRyaWJ1dGVzLm9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgIHNjaGVtYS5wcm9wcy5hdHRyaWJ1dGVzLnByb3BzLm5hbWUub3B0aW9uYWwgPSB0cnVlO1xuICAgICAgc2NoZW1hLnByb3BzLmNvbnRlbnQub3B0aW9uYWwgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyB2YWxpZGF0ZVxuICAgIHZhbGlkYXRlKGNvbnRyb2wsIHNjaGVtYSwgJ0NvbnRyb2xbJyArIChpICsgMSkgKyAnXSAnKTtcblxuICAgIGlmICghY29udHJvbC5hdHRyaWJ1dGVzKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBlbnN1cmUgdW5pcXVlIG5hbWVzXG4gICAgaWYgKGNvbnRyb2wuYXR0cmlidXRlcy5uYW1lIGluIGlucHV0TmFtZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0NvbnRyb2xbJyArXG4gICAgICAgICAgKGkgKyAxKSArXG4gICAgICAgICAgJ10gYXR0cmlidXRlcy5uYW1lIFwiJyArXG4gICAgICAgICAgY29udHJvbC5hdHRyaWJ1dGVzLm5hbWUgK1xuICAgICAgICAgICdcIiBoYXMgYWxyZWFkeSBiZWVuIHVzZWQgd2l0aCBDb250cm9sWycgK1xuICAgICAgICAgIChpbnB1dE5hbWVzW2NvbnRyb2wuYXR0cmlidXRlcy5uYW1lXSArIDEpICtcbiAgICAgICAgICAnXSdcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaW5wdXROYW1lc1tjb250cm9sLmF0dHJpYnV0ZXMubmFtZV0gPSBpO1xuXG4gICAgaWYgKCdpZCcgaW4gY29udHJvbC5hdHRyaWJ1dGVzICYmIGNvbnRyb2wuYXR0cmlidXRlcy5pZCBpbiBpbnB1dElkcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ29udHJvbFsnICtcbiAgICAgICAgICAoaSArIDEpICtcbiAgICAgICAgICAnXSBhdHRyaWJ1dGVzLmlkIFwiJyArXG4gICAgICAgICAgY29udHJvbC5hdHRyaWJ1dGVzLmlkICtcbiAgICAgICAgICAnXCIgaGFzIGFscmVhZHkgYmVlbiB1c2VkIHdpdGggQ29udHJvbFsnICtcbiAgICAgICAgICAoaW5wdXRJZHNbY29udHJvbC5hdHRyaWJ1dGVzLmlkXSArIDEpICtcbiAgICAgICAgICAnXSdcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaW5wdXRJZHNbY29udHJvbC5hdHRyaWJ1dGVzLmlkXSA9IGk7XG5cbiAgICAvLyBhZGQgaWQgYXR0cmlidXRlIGlmIG1pc3NpbmdcbiAgICBpZiAoJ2lkJyBpbiBjb250cm9sLmF0dHJpYnV0ZXMgPT09IGZhbHNlKSB7XG4gICAgICBjb250cm9sLmF0dHJpYnV0ZXMuaWQgPSAnY29udHJvbC0nICsgY29udHJvbC5lbGVtZW50ICsgJy0nICsgKGkgKyAxKTtcbiAgICB9XG4gIH1cblxuICBpbnB1dE5hbWVzID0gbnVsbDtcbiAgaW5wdXRJZHMgPSBudWxsO1xuICBjb250cm9sID0gbnVsbDtcblxuICByZXR1cm4gY29udHJvbHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKGNvbnRyb2wpIHtcbiAgbGV0IGxhYmVsID0gbGFiZWxUZXh0KGNvbnRyb2wpO1xuICBsZXQgdmFsdWVTY2hlbWEgPSB7XG4gICAgdHlwZTogJ3N0cmluZycsXG4gICAgbGFiZWwsXG4gICAgb3B0aW9uYWw6IHRydWUsXG4gICAgY29udmVydDogdHJ1ZSxcbiAgfTtcblxuICBpZiAoJ3ZhbGlkYXRpb24nIGluIGNvbnRyb2wpIHtcbiAgICB2YWx1ZVNjaGVtYSA9IG1lcmdlKHZhbHVlU2NoZW1hLCBjb250cm9sLnZhbGlkYXRpb24pO1xuICB9IGVsc2Uge1xuICAgIC8vIGlmIHJlcXVpcmVkXG4gICAgaWYgKGNvbnRyb2wuYXR0cmlidXRlcy5yZXF1aXJlZCkge1xuICAgICAgdmFsdWVTY2hlbWEudHlwZSA9IHZhbGlkYXRpb25UeXBlc1tjb250cm9sLmF0dHJpYnV0ZXMudHlwZV0gfHwgJ3N0cmluZyc7XG4gICAgICB2YWx1ZVNjaGVtYS5vcHRpb25hbCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGxldCBzY2hlbWEgPSB7XG4gICAgdmFsdWU6IHZhbHVlU2NoZW1hLFxuICB9O1xuXG4gIC8vIHZhbGlkYXRlXG4gIGxldCBvYmogPSB7IHZhbHVlOiBjb250cm9sLmF0dHJpYnV0ZXMudmFsdWUgfTtcbiAgbGV0IGVycm9yID0gdmFsaWRhdGUob2JqLCBzY2hlbWEsICcnLCBmYWxzZSk7XG5cbiAgY29udHJvbC5hdHRyaWJ1dGVzLnZhbHVlID0gb2JqLnZhbHVlO1xuICBjb250cm9sLmVycm9yID0gZXJyb3I7XG5cbiAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoc2NoZW1hLCAwLCA0KSk7XG4gIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGVycm9yLCAwLCA0KSk7XG59XG4iLCI8IS0tXG4gQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuIFxuIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4tLT5cblxuPHNjcmlwdD5cbiAgICBleHBvcnQgbGV0IGNvbnRyb2w7XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz1cImVycm9yXCI+e0BodG1sIGNvbnRyb2wuZXJyb3IgfHwgXCJcIn08L2Rpdj4iLCI8IS0tXG4gQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuIFxuIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4tLT5cblxuPHNjcmlwdD5cbiAgaW1wb3J0IHsgbGFiZWxUZXh0IH0gZnJvbSBcIi4uL2xpYi91dGlscy5qc1wiO1xuXG4gIGV4cG9ydCBsZXQgY29udHJvbDtcbiAgZXhwb3J0IGxldCBsYWJlbDtcbiAgZXhwb3J0IGxldCBpZDtcblxuICAkOiBpZiAoIWxhYmVsKSB7XG4gICAgbGFiZWwgPSBsYWJlbFRleHQoY29udHJvbCk7XG4gIH1cbjwvc2NyaXB0PlxuXG5cbjxsYWJlbCBmb3I9e2lkIHx8IGNvbnRyb2wuYXR0cmlidXRlcy5pZH0+e0BodG1sIGxhYmVsfTwvbGFiZWw+XG5cblxuIiwiPCEtLVxuIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiBcbiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuLS0+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBFcnJvciBmcm9tIFwiLi4vRXJyb3Iuc3ZlbHRlXCI7XG4gIGltcG9ydCBMYWJlbCBmcm9tIFwiLi4vTGFiZWwuc3ZlbHRlXCI7XG5cbiAgZXhwb3J0IGxldCBjb250cm9sO1xuICBleHBvcnQgbGV0IG9uQ2hhbmdlO1xuXG4gIGxldCB0eXBlO1xuXG4gICQ6IHtcbiAgICB0eXBlID0gY29udHJvbC5hdHRyaWJ1dGVzLnR5cGU7XG4gIH1cblxuICAvLyAgICQ6IGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGNvbnRyb2wsIDAsIDQpKTtcbjwvc2NyaXB0PlxuXG48IS0tIFJhZGlvIEJveGVzIC0tPlxueyNpZiB0eXBlID09IFwicmFkaW9cIn1cbiAgPGRpdiBjbGFzcz1cImxhYmVsLWNvbnRhaW5lclwiPlxuICAgIDxkaXY+XG4gICAgICB7I2VhY2ggY29udHJvbC5vcHRpb25zIGFzIG9wdGlvbiwgaX1cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgey4uLmNvbnRyb2wuYXR0cmlidXRlc31cbiAgICAgICAgICBpZD17Y29udHJvbC5hdHRyaWJ1dGVzLmlkICsgXCItXCIgKyAoaSArIDEpfVxuICAgICAgICAgIHZhbHVlPXtvcHRpb24udmFsdWUgfHwgb3B0aW9ufVxuICAgICAgICAgIG9uOmNoYW5nZT17b25DaGFuZ2V9XG4gICAgICAgICAgb246a2V5dXA9e29uQ2hhbmdlfVxuICAgICAgICAgIFxuICAgICAgICAvPlxuXG4gICAgICAgIDxMYWJlbFxuICAgICAgICAgIGJpbmQ6Y29udHJvbFxuICAgICAgICAgIGxhYmVsPXtvcHRpb24udGV4dCB8fCBvcHRpb259XG4gICAgICAgICAgaWQ9e2NvbnRyb2wuYXR0cmlidXRlcy5pZCArIFwiLVwiICsgKGkgKyAxKX1cbiAgICAgICAgLz5cbiAgICAgIHsvZWFjaH1cbiAgICA8L2Rpdj5cblxuICAgIDxFcnJvciBiaW5kOmNvbnRyb2wgLz5cbiAgPC9kaXY+XG5cbiAgPCEtLSBDaGVjayBCb3hlcyAtLT5cbns6ZWxzZSBpZiB0eXBlID09IFwiY2hlY2tib3hcIn1cbiAgPGRpdiBjbGFzcz1cImxhYmVsLWNvbnRhaW5lclwiPlxuICAgIDxkaXY+XG4gICAgICA8aW5wdXQgey4uLmNvbnRyb2wuYXR0cmlidXRlc30gb246Y2hhbmdlPXtvbkNoYW5nZX0gb246a2V5dXA9e29uQ2hhbmdlfSAvPlxuXG4gICAgICA8TGFiZWwgYmluZDpjb250cm9sIC8+XG4gICAgPC9kaXY+XG5cbiAgICA8RXJyb3IgYmluZDpjb250cm9sIC8+XG4gIDwvZGl2PlxuezplbHNlIGlmIHR5cGUgPT0gXCJoaWRkZW5cIn1cbiAgPGlucHV0IHsuLi5jb250cm9sLmF0dHJpYnV0ZXN9IG9uOmNoYW5nZT17b25DaGFuZ2V9IG9uOmtleXVwPXtvbkNoYW5nZX0gLz5cbns6ZWxzZX1cbiAgPGRpdiBjbGFzcz1cImxhYmVsLWNvbnRhaW5lclwiPlxuICAgIDxMYWJlbCBiaW5kOmNvbnRyb2wgLz5cbiAgICA8RXJyb3IgYmluZDpjb250cm9sIC8+XG4gIDwvZGl2PlxuICA8aW5wdXQgey4uLmNvbnRyb2wuYXR0cmlidXRlc30gb246Y2hhbmdlPXtvbkNoYW5nZX0gb246a2V5dXA9e29uQ2hhbmdlfSAvPlxuey9pZn1cbiIsIjwhLS1cbiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gXG4gVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbi0tPlxuXG48c2NyaXB0PlxuICBpbXBvcnQgRXJyb3IgZnJvbSBcIi4uL0Vycm9yLnN2ZWx0ZVwiO1xuICBpbXBvcnQgTGFiZWwgZnJvbSBcIi4uL0xhYmVsLnN2ZWx0ZVwiO1xuXG4gIGV4cG9ydCBsZXQgY29udHJvbDtcbiAgZXhwb3J0IGxldCBvbkNoYW5nZTtcblxuICAvLyAgICQ6IGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGNvbnRyb2wsIDAsIDQpKTtcbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwibGFiZWwtY29udGFpbmVyXCI+XG4gIDxMYWJlbCBiaW5kOmNvbnRyb2wgLz5cbiAgPEVycm9yIGJpbmQ6Y29udHJvbCAvPlxuPC9kaXY+XG5cbjxzZWxlY3RcbiAgey4uLmNvbnRyb2wuYXR0cmlidXRlc31cbiAgb246Y2hhbmdlPXtvbkNoYW5nZX1cbiAgcGxhY2Vob2xkZXI9e2NvbnRyb2wuYXR0cmlidXRlcy52YWx1ZSA/IG51bGwgOiBjb250cm9sLmF0dHJpYnV0ZXMucGxhY2Vob2xkZXJ9XG4gIFxuPlxuICB7I2lmIGNvbnRyb2wuYXR0cmlidXRlcy5wbGFjZWhvbGRlcn1cbiAgICA8b3B0aW9uIHZhbHVlPXtudWxsfSBzZWxlY3RlZCBkaXNhYmxlZD57Y29udHJvbC5hdHRyaWJ1dGVzLnBsYWNlaG9sZGVyfTwvb3B0aW9uPlxuICB7L2lmfVxuICB7I2VhY2ggY29udHJvbC5vcHRpb25zIGFzIG9wdGlvbn1cbiAgICA8b3B0aW9uIHZhbHVlPXtvcHRpb24udmFsdWUgfHwgb3B0aW9ufT57b3B0aW9uLnRleHQgfHwgb3B0aW9ufTwvb3B0aW9uPlxuICB7L2VhY2h9XG48L3NlbGVjdD5cbiIsIjwhLS1cbiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gXG4gVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbi0tPlxuXG48c2NyaXB0PlxuICBpbXBvcnQgRXJyb3IgZnJvbSBcIi4uL0Vycm9yLnN2ZWx0ZVwiO1xuICBpbXBvcnQgTGFiZWwgZnJvbSBcIi4uL0xhYmVsLnN2ZWx0ZVwiO1xuXG4gIGV4cG9ydCBsZXQgY29udHJvbDtcbiAgZXhwb3J0IGxldCBvbkNoYW5nZTtcblxuICAvLyAgICQ6IGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGNvbnRyb2wsIDAsIDQpKTtcbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwibGFiZWwtY29udGFpbmVyXCI+XG4gIDxMYWJlbCBiaW5kOmNvbnRyb2wgLz5cbiAgPEVycm9yIGJpbmQ6Y29udHJvbCAvPlxuPC9kaXY+XG5cbjx0ZXh0YXJlYSB7Li4uY29udHJvbC5hdHRyaWJ1dGVzfSBvbjpjaGFuZ2U9e29uQ2hhbmdlfSBvbjprZXl1cD17b25DaGFuZ2V9ICAgLz5cbiIsIjwhLS1cbiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gXG4gVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbi0tPlxuXG48c2NyaXB0PlxuICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuICBpbXBvcnQgeyB2YWxpZGF0ZVZhbHVlIH0gZnJvbSBcIi4uL2xpYi92YWxpZGF0aW9uXCI7XG4gIGltcG9ydCBJbnB1dCBmcm9tIFwiLi9jb250cm9scy9JbnB1dC5zdmVsdGVcIjtcbiAgaW1wb3J0IFNlbGVjdCBmcm9tIFwiLi9jb250cm9scy9TZWxlY3Quc3ZlbHRlXCI7XG4gIGltcG9ydCBUZXh0YXJlYSBmcm9tIFwiLi9jb250cm9scy9UZXh0YXJlYS5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgZm9ybUlucHV0VHlwZXMgfSBmcm9tIFwiLi4vbGliL3V0aWxzXCI7XG5cbiAgZXhwb3J0IGxldCBjb250cm9sO1xuICBleHBvcnQgbGV0IGlkeDtcblxuICBsZXQgdHlwZTtcblxuICAkOiB7XG4gICAgaWYgKGZvcm1JbnB1dFR5cGVzLmluZGV4T2YoY29udHJvbC5lbGVtZW50KSA+IC0xKSB7XG4gICAgICB0eXBlID0gY29udHJvbC5hdHRyaWJ1dGVzLnR5cGUgfHwgY29udHJvbC5lbGVtZW50O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlKGUsIHZhbCkge1xuICAgIGxldCB2YWx1ZTtcblxuICAgIGlmIChlKSB7XG4gICAgICBsZXQgZWwgPSBlLnRhcmdldDtcbiAgICAgIGlmIChlbC50eXBlID09IFwiY2hlY2tib3hcIikge1xuICAgICAgICB2YWx1ZSA9IGVsLmNoZWNrZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGVsLnZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSA9IHZhbDtcbiAgICB9XG5cbiAgICBjb250cm9sLmF0dHJpYnV0ZXMudmFsdWUgPSB2YWx1ZTtcbiAgICB2YWxpZGF0ZVZhbHVlKGNvbnRyb2wsIGlkeCk7XG4gIH1cblxuICAvLyBydW4gb25DaGFuZ2UgaWYgdGhlcmUgaXMgYSB2YWx1ZSBwYXNzZWQgb24gY3JlYXRpb25cbiAgb25Nb3VudChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGNvbnRyb2wuYXR0cmlidXRlcyAmJiAoXCJ2YWx1ZVwiIGluIGNvbnRyb2wuYXR0cmlidXRlcyB8fCBjb250cm9sLmF0dHJpYnV0ZXMucmVxdWlyZWQpKSB7XG4gICAgICBvbkNoYW5nZShudWxsLCBjb250cm9sLmF0dHJpYnV0ZXMudmFsdWUpO1xuICAgIH1cbiAgfSk7XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz17Y29udHJvbC5jbGFzc2VzLmpvaW4oXCIgXCIpfT5cbiAgPGRpdiBjbGFzcz1cImNvbnRyb2wtZ3JvdXB7Y29udHJvbC5lcnJvciA/ICcgaGFzLWVycm9yJyA6ICcnfSB7dHlwZSB8fCAnIGNvbnRlbnQnfSBcIj5cbiAgICB7I2lmIGNvbnRyb2wuZWxlbWVudCA9PSBcImlucHV0XCJ9XG4gICAgICA8SW5wdXQgYmluZDpjb250cm9sIHtvbkNoYW5nZX0gLz5cbiAgICB7OmVsc2UgaWYgY29udHJvbC5lbGVtZW50ID09IFwic2VsZWN0XCJ9XG4gICAgICA8U2VsZWN0IGJpbmQ6Y29udHJvbCB7b25DaGFuZ2V9IC8+XG4gICAgezplbHNlIGlmIGNvbnRyb2wuZWxlbWVudCA9PSBcInRleHRhcmVhXCJ9XG4gICAgICA8VGV4dGFyZWEgYmluZDpjb250cm9sIHtvbkNoYW5nZX0gLz5cbiAgICB7OmVsc2V9XG4gICAgICA8c3ZlbHRlOmVsZW1lbnQgdGhpcz17Y29udHJvbC5lbGVtZW50fT5cbiAgICAgICAge0BodG1sIGNvbnRyb2wuY29udGVudH1cbiAgICAgIDwvc3ZlbHRlOmVsZW1lbnQ+XG4gICAgey9pZn1cbiAgPC9kaXY+XG48L2Rpdj5cbiIsImltcG9ydCB7XG5cdHJ1bl9hbGwsXG5cdHN1YnNjcmliZSxcblx0bm9vcCxcblx0c2FmZV9ub3RfZXF1YWwsXG5cdGlzX2Z1bmN0aW9uLFxuXHRnZXRfc3RvcmVfdmFsdWVcbn0gZnJvbSAnLi4vaW50ZXJuYWwvaW5kZXguanMnO1xuXG5jb25zdCBzdWJzY3JpYmVyX3F1ZXVlID0gW107XG5cbi8qKlxuICogQ3JlYXRlcyBhIGBSZWFkYWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI3JlYWRhYmxlXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlN0YXJ0U3RvcE5vdGlmaWVyPFQ+fSBbc3RhcnRdXG4gKiBAcmV0dXJucyB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlJlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGFibGUodmFsdWUsIHN0YXJ0KSB7XG5cdHJldHVybiB7XG5cdFx0c3Vic2NyaWJlOiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQpLnN1YnNjcmliZVxuXHR9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBXcml0YWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgYm90aCB1cGRhdGluZyBhbmQgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI3dyaXRhYmxlXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlN0YXJ0U3RvcE5vdGlmaWVyPFQ+fSBbc3RhcnRdXG4gKiBAcmV0dXJucyB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLldyaXRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuXHQvKiogQHR5cGUge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5VbnN1YnNjcmliZXJ9ICovXG5cdGxldCBzdG9wO1xuXHQvKiogQHR5cGUge1NldDxpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLlN1YnNjcmliZUludmFsaWRhdGVUdXBsZTxUPj59ICovXG5cdGNvbnN0IHN1YnNjcmliZXJzID0gbmV3IFNldCgpO1xuXHQvKiogQHBhcmFtIHtUfSBuZXdfdmFsdWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0aWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG5cdFx0XHR2YWx1ZSA9IG5ld192YWx1ZTtcblx0XHRcdGlmIChzdG9wKSB7XG5cdFx0XHRcdC8vIHN0b3JlIGlzIHJlYWR5XG5cdFx0XHRcdGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHN1YnNjcmliZXJzKSB7XG5cdFx0XHRcdFx0c3Vic2NyaWJlclsxXSgpO1xuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUucHVzaChzdWJzY3JpYmVyLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bl9xdWV1ZSkge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5VcGRhdGVyPFQ+fSBmblxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGZ1bmN0aW9uIHVwZGF0ZShmbikge1xuXHRcdHNldChmbih2YWx1ZSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlN1YnNjcmliZXI8VD59IHJ1blxuXHQgKiBAcGFyYW0ge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuSW52YWxpZGF0b3I8VD59IFtpbnZhbGlkYXRlXVxuXHQgKiBAcmV0dXJucyB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlVuc3Vic2NyaWJlcn1cblx0ICovXG5cdGZ1bmN0aW9uIHN1YnNjcmliZShydW4sIGludmFsaWRhdGUgPSBub29wKSB7XG5cdFx0LyoqIEB0eXBlIHtpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLlN1YnNjcmliZUludmFsaWRhdGVUdXBsZTxUPn0gKi9cblx0XHRjb25zdCBzdWJzY3JpYmVyID0gW3J1biwgaW52YWxpZGF0ZV07XG5cdFx0c3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpO1xuXHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAxKSB7XG5cdFx0XHRzdG9wID0gc3RhcnQoc2V0LCB1cGRhdGUpIHx8IG5vb3A7XG5cdFx0fVxuXHRcdHJ1bih2YWx1ZSk7XG5cdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdHN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKTtcblx0XHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAwICYmIHN0b3ApIHtcblx0XHRcdFx0c3RvcCgpO1xuXHRcdFx0XHRzdG9wID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS1zdG9yZSNkZXJpdmVkXG4gKiBAdGVtcGxhdGUge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuU3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3JlcyAtIGlucHV0IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLlN0b3Jlc1ZhbHVlczxTPiwgc2V0OiAodmFsdWU6IFQpID0+IHZvaWQsIHVwZGF0ZTogKGZuOiBpbXBvcnQoJy4vcHVibGljLmpzJykuVXBkYXRlcjxUPikgPT4gdm9pZCkgPT4gaW1wb3J0KCcuL3B1YmxpYy5qcycpLlVuc3Vic2NyaWJlciB8IHZvaWR9IGZuIC0gZnVuY3Rpb24gY2FsbGJhY2sgdGhhdCBhZ2dyZWdhdGVzIHRoZSB2YWx1ZXNcbiAqIEBwYXJhbSB7VH0gW2luaXRpYWxfdmFsdWVdIC0gaW5pdGlhbCB2YWx1ZVxuICogQHJldHVybnMge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5SZWFkYWJsZTxUPn1cbiAqL1xuXG4vKipcbiAqIERlcml2ZWQgdmFsdWUgc3RvcmUgYnkgc3luY2hyb25pemluZyBvbmUgb3IgbW9yZSByZWFkYWJsZSBzdG9yZXMgYW5kXG4gKiBhcHBseWluZyBhbiBhZ2dyZWdhdGlvbiBmdW5jdGlvbiBvdmVyIGl0cyBpbnB1dCB2YWx1ZXMuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI2Rlcml2ZWRcbiAqIEB0ZW1wbGF0ZSB7aW1wb3J0KCcuL3ByaXZhdGUuanMnKS5TdG9yZXN9IFNcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAb3ZlcmxvYWRcbiAqIEBwYXJhbSB7U30gc3RvcmVzIC0gaW5wdXQgc3RvcmVzXG4gKiBAcGFyYW0geyh2YWx1ZXM6IGltcG9ydCgnLi9wcml2YXRlLmpzJykuU3RvcmVzVmFsdWVzPFM+KSA9PiBUfSBmbiAtIGZ1bmN0aW9uIGNhbGxiYWNrIHRoYXQgYWdncmVnYXRlcyB0aGUgdmFsdWVzXG4gKiBAcGFyYW0ge1R9IFtpbml0aWFsX3ZhbHVlXSAtIGluaXRpYWwgdmFsdWVcbiAqIEByZXR1cm5zIHtpbXBvcnQoJy4vcHVibGljLmpzJykuUmVhZGFibGU8VD59XG4gKi9cblxuLyoqXG4gKiBAdGVtcGxhdGUge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuU3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge1R9IFtpbml0aWFsX3ZhbHVlXVxuICogQHJldHVybnMge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5SZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuXHRjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuXHQvKiogQHR5cGUge0FycmF5PGltcG9ydCgnLi9wdWJsaWMuanMnKS5SZWFkYWJsZTxhbnk+Pn0gKi9cblx0Y29uc3Qgc3RvcmVzX2FycmF5ID0gc2luZ2xlID8gW3N0b3Jlc10gOiBzdG9yZXM7XG5cdGlmICghc3RvcmVzX2FycmF5LmV2ZXJ5KEJvb2xlYW4pKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdkZXJpdmVkKCkgZXhwZWN0cyBzdG9yZXMgYXMgaW5wdXQsIGdvdCBhIGZhbHN5IHZhbHVlJyk7XG5cdH1cblx0Y29uc3QgYXV0byA9IGZuLmxlbmd0aCA8IDI7XG5cdHJldHVybiByZWFkYWJsZShpbml0aWFsX3ZhbHVlLCAoc2V0LCB1cGRhdGUpID0+IHtcblx0XHRsZXQgc3RhcnRlZCA9IGZhbHNlO1xuXHRcdGNvbnN0IHZhbHVlcyA9IFtdO1xuXHRcdGxldCBwZW5kaW5nID0gMDtcblx0XHRsZXQgY2xlYW51cCA9IG5vb3A7XG5cdFx0Y29uc3Qgc3luYyA9ICgpID0+IHtcblx0XHRcdGlmIChwZW5kaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNsZWFudXAoKTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGZuKHNpbmdsZSA/IHZhbHVlc1swXSA6IHZhbHVlcywgc2V0LCB1cGRhdGUpO1xuXHRcdFx0aWYgKGF1dG8pIHtcblx0XHRcdFx0c2V0KHJlc3VsdCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjbGVhbnVwID0gaXNfZnVuY3Rpb24ocmVzdWx0KSA/IHJlc3VsdCA6IG5vb3A7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRjb25zdCB1bnN1YnNjcmliZXJzID0gc3RvcmVzX2FycmF5Lm1hcCgoc3RvcmUsIGkpID0+XG5cdFx0XHRzdWJzY3JpYmUoXG5cdFx0XHRcdHN0b3JlLFxuXHRcdFx0XHQodmFsdWUpID0+IHtcblx0XHRcdFx0XHR2YWx1ZXNbaV0gPSB2YWx1ZTtcblx0XHRcdFx0XHRwZW5kaW5nICY9IH4oMSA8PCBpKTtcblx0XHRcdFx0XHRpZiAoc3RhcnRlZCkge1xuXHRcdFx0XHRcdFx0c3luYygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRcdHBlbmRpbmcgfD0gMSA8PCBpO1xuXHRcdFx0XHR9XG5cdFx0XHQpXG5cdFx0KTtcblx0XHRzdGFydGVkID0gdHJ1ZTtcblx0XHRzeW5jKCk7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uIHN0b3AoKSB7XG5cdFx0XHRydW5fYWxsKHVuc3Vic2NyaWJlcnMpO1xuXHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0Ly8gV2UgbmVlZCB0byBzZXQgdGhpcyB0byBmYWxzZSBiZWNhdXNlIGNhbGxiYWNrcyBjYW4gc3RpbGwgaGFwcGVuIGRlc3BpdGUgaGF2aW5nIHVuc3Vic2NyaWJlZDpcblx0XHRcdC8vIENhbGxiYWNrcyBtaWdodCBhbHJlYWR5IGJlIHBsYWNlZCBpbiB0aGUgcXVldWUgd2hpY2ggZG9lc24ndCBrbm93IGl0IHNob3VsZCBubyBsb25nZXJcblx0XHRcdC8vIGludm9rZSB0aGlzIGRlcml2ZWQgc3RvcmUuXG5cdFx0XHRzdGFydGVkID0gZmFsc2U7XG5cdFx0fTtcblx0fSk7XG59XG5cbi8qKlxuICogVGFrZXMgYSBzdG9yZSBhbmQgcmV0dXJucyBhIG5ldyBvbmUgZGVyaXZlZCBmcm9tIHRoZSBvbGQgb25lIHRoYXQgaXMgcmVhZGFibGUuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI3JlYWRvbmx5XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtpbXBvcnQoJy4vcHVibGljLmpzJykuUmVhZGFibGU8VD59IHN0b3JlICAtIHN0b3JlIHRvIG1ha2UgcmVhZG9ubHlcbiAqIEByZXR1cm5zIHtpbXBvcnQoJy4vcHVibGljLmpzJykuUmVhZGFibGU8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkb25seShzdG9yZSkge1xuXHRyZXR1cm4ge1xuXHRcdHN1YnNjcmliZTogc3RvcmUuc3Vic2NyaWJlLmJpbmQoc3RvcmUpXG5cdH07XG59XG5cbmV4cG9ydCB7IGdldF9zdG9yZV92YWx1ZSBhcyBnZXQgfTtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuICpcbiAqIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG5pbXBvcnQgeyB3cml0YWJsZSB9IGZyb20gJ3N2ZWx0ZS9zdG9yZSc7XG5cbmV4cG9ydCBjb25zdCBFcnJvcnMgPSB3cml0YWJsZSh7fSk7XG5leHBvcnQgY29uc3QgVmFsdWVzID0gd3JpdGFibGUoe30pOyIsIjwhLS1cbiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gXG4gVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbi0tPlxuXG48c2NyaXB0PlxuICBpbXBvcnQgXCIuL3N0eWxlcy9ib290c3RyYXAtZ3JpZC5zY3NzXCI7XG4gIGltcG9ydCBcIi4vc3R5bGVzL2Zvcm0uc2Nzc1wiO1xuXG4gIGltcG9ydCBDb250cm9sIGZyb20gXCIuL2VsZW1lbnRzL0NvbnRyb2wuc3ZlbHRlXCI7XG4gIGltcG9ydCB7IHZhbGlkYXRlQ29udHJvbHMgfSBmcm9tIFwiLi9saWIvdmFsaWRhdGlvbi5qc1wiO1xuICBpbXBvcnQgeyBFcnJvcnMsIFZhbHVlcyB9IGZyb20gXCIuL2xpYi9zdG9yZVwiO1xuICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuXG4gIGV4cG9ydCBsZXQgY29udHJvbHMgPSBbXTtcbiAgZXhwb3J0IGxldCBtZXRob2QgPSBcIlBPU1RcIjtcbiAgZXhwb3J0IGxldCBhY3Rpb24gPSBcIlwiO1xuICBleHBvcnQgbGV0IGZhaWxPbkVycm9yID0gdHJ1ZTtcblxuICBsZXQgaXNSZWFkeSA9IGZhbHNlO1xuXG4gICQ6IHtcbiAgICBsZXQgZXJyb3JzID0ge307XG4gICAgbGV0IHZhbHVlcyA9IHt9O1xuXG4gICAgZm9yIChsZXQgaSBpbiBjb250cm9scykge1xuICAgICAgaWYgKFwiZXJyb3JcIiBpbiBjb250cm9sc1tpXSAmJiBjb250cm9sc1tpXS5lcnJvcikge1xuICAgICAgICBlcnJvcnNbY29udHJvbHNbaV0uYXR0cmlidXRlcy5uYW1lXSA9IGNvbnRyb2xzW2ldLmVycm9yO1xuICAgICAgfVxuICAgICAgaWYgKGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMgJiYgXCJ2YWx1ZVwiIGluIGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgLy8gdXNlIGJvb2xlYW5zIGZvciBjaGVja2JveGVzXG4gICAgICAgIGlmIChjb250cm9sc1tpXS5hdHRyaWJ1dGVzLnR5cGUgPT0gXCJjaGVja2JveFwiKSB7XG4gICAgICAgICAgY29udHJvbHNbaV0uYXR0cmlidXRlcy52YWx1ZSA9IGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMudmFsdWUgPT0gXCJ0cnVlXCIgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzW2NvbnRyb2xzW2ldLmF0dHJpYnV0ZXMubmFtZV0gPSBjb250cm9sc1tpXS5hdHRyaWJ1dGVzLnZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIEVycm9ycy51cGRhdGUoKG8pID0+IGVycm9ycyk7XG4gICAgVmFsdWVzLnVwZGF0ZSgobykgPT4gdmFsdWVzKTtcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShlcnJvcnMsIDAsIDQpKTtcbiAgfVxuXG4gICQ6IHtcbiAgICBjb25zb2xlLmxvZygkRXJyb3JzKTtcbiAgICBjb25zb2xlLmxvZygkVmFsdWVzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN1Ym1pdEZvcm0oZSkge1xuICAgIGlmIChmYWlsT25FcnJvciAmJiBoYXNFcnJvcnMoKSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc0Vycm9ycygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoJEVycm9ycykubGVuZ3RoID4gMDtcbiAgfVxuXG4gIG9uTW91bnQoZnVuY3Rpb24gKCkge1xuICAgIHZhbGlkYXRlQ29udHJvbHMoY29udHJvbHMpO1xuICAgIGlzUmVhZHkgPSB0cnVlO1xuICB9KTtcbjwvc2NyaXB0PlxuXG57I2lmIGlzUmVhZHl9XG4gIDxkaXYgY2xhc3M9XCJmb3JtZXJcIj5cbiAgICA8Zm9ybSBjbGFzcz1cImNvbnRhaW5lci1mbHVpZFwiIG9uOnN1Ym1pdD17c3VibWl0Rm9ybX0ge2FjdGlvbn0ge21ldGhvZH0+XG4gICAgICA8ZGl2IGNsYXNzPVwicm93XCI+XG4gICAgICAgIHsjZWFjaCBjb250cm9scyBhcyBjb250cm9sLCBpfVxuICAgICAgICAgIDxDb250cm9sIGJpbmQ6Y29udHJvbCBpZHg9e2kgKyAxfSAvPlxuICAgICAgICB7L2VhY2h9XG5cbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ1dHRvblwiPlN1Ym1pdDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9mb3JtPlxuICA8L2Rpdj5cbnsvaWZ9XG4iXSwibmFtZXMiOlsiZ2xvYmFsIiwidGhpcyIsImNyZWF0ZV9pZl9ibG9jayJdLCJtYXBwaW5ncyI6Ijs7O0NBQUE7Q0FDTyxTQUFTLElBQUksR0FBRyxFQUFFO0FBR3pCO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDTyxTQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0NBQ2pDO0NBQ0EsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ3RDLENBQUMsNkJBQTZCLEdBQUcsRUFBRTtDQUNuQyxDQUFDO0FBc0JEO0NBQ08sU0FBUyxHQUFHLENBQUMsRUFBRSxFQUFFO0NBQ3hCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztDQUNiLENBQUM7QUFDRDtDQUNPLFNBQVMsWUFBWSxHQUFHO0NBQy9CLENBQUMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzVCLENBQUM7QUFDRDtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ08sU0FBUyxPQUFPLENBQUMsR0FBRyxFQUFFO0NBQzdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUNsQixDQUFDO0FBQ0Q7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNPLFNBQVMsV0FBVyxDQUFDLEtBQUssRUFBRTtDQUNuQyxDQUFDLE9BQU8sT0FBTyxLQUFLLEtBQUssVUFBVSxDQUFDO0NBQ3BDLENBQUM7QUFDRDtDQUNBO0NBQ08sU0FBUyxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtDQUNyQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLFVBQVUsQ0FBQztDQUM3RixDQUFDO0FBb0REO0NBQ0E7Q0FDTyxTQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUU7Q0FDOUIsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztDQUN0QyxDQUFDO0FBUUQ7Q0FDTyxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxTQUFTLEVBQUU7Q0FDL0MsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Q0FDcEIsRUFBRSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtDQUNwQyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUN2QixHQUFHO0NBQ0gsRUFBRSxPQUFPLElBQUksQ0FBQztDQUNkLEVBQUU7Q0FDRixDQUFDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQztDQUM3QyxDQUFDLE9BQU8sS0FBSyxDQUFDLFdBQVcsR0FBRyxNQUFNLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUM7Q0FDOUQsQ0FBQztBQWVEO0NBQ0E7Q0FDTyxTQUFTLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFO0NBQ2hFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztDQUMxRDs7Q0N0QkE7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNPLFNBQVMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUU7Q0FDckMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzFCLENBQUM7QUF1RkQ7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDTyxTQUFTLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtDQUM3QyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQztDQUMzQyxDQUFDO0FBZUQ7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNPLFNBQVMsTUFBTSxDQUFDLElBQUksRUFBRTtDQUM3QixDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtDQUN0QixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ3BDLEVBQUU7Q0FDRixDQUFDO0FBQ0Q7Q0FDQTtDQUNBO0NBQ08sU0FBUyxZQUFZLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRTtDQUNwRCxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7Q0FDaEQsRUFBRSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0NBQ2hELEVBQUU7Q0FDRixDQUFDO0FBQ0Q7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ08sU0FBUyxPQUFPLENBQUMsSUFBSSxFQUFFO0NBQzlCLENBQUMsT0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ3JDLENBQUM7QUEwQ0Q7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNPLFNBQVMsSUFBSSxDQUFDLElBQUks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LENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7O0NDQXh0QixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMvWixDQUFBLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU9BLGNBQU0sRUFBRUEsY0FBTSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDQyxjQUFJLENBQUMsQ0FBQztFQUN0ZSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxHQUFHLE9BQU8sTUFBTSxFQUFFLFFBQVEsR0FBRyxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7Q0FDclUsQ0FBQSxDQUFDLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0VBQy9PLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUss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QUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDL2QsQ0FBQSxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksTUFBTSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQzVkLENBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLE1BQU0sQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ2phLENBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ25WLENBQUEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOWUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxPQUFPLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbE8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFNLFFBQVEsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsRUFBRSxVQUFVLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDMWYsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLG9CQUFvQjtDQUNwZ0IsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUNsVixDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsT0FBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHO0VBQ3RmLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUM7RUFDemYsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0VBQ3hnQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztDQUM5ZixDQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDbGMsQ0FBQSxDQUFDLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUM5WCxDQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFDMUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDcmdCLENBQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLE9BQU8sTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTztDQUMxZixDQUFBLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTSxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9iQUFvYjtFQUNqMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTSxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFGQUFxRixDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0VBQ3pmLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0RBQWdELENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywrRUFBK0UsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2RUFBNkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhO0NBQ25nQixDQUFBLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLCtNQUErTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxPQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdEQUFnRDtFQUM3aEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsT0FBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FB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LEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztDQUN6ZixDQUFBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBQyxDQUFDLElBQUk7Q0FDbGdCLENBQUEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLDRCQUE0QjtFQUMxZixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLDJCQUEyQjtFQUN2ZixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENB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LFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO0VBQ3JmLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUMs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Q0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVc7RUFDdGdCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsMENBQTBDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FB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QUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVEQUF1RCxDQUFDLENBQUMsT0FBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztDQUNoZ0IsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENB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Q0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVTtFQUM5ZixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdB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QVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtDQUM3ZixDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUM7Q0FDeGdCLENBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUNBQXFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLHVDQUF1QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7RUFDL2hCLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUTtDQUNoZ0IsQ0FBQSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLG9FQUFvRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsdWJBQXViLENBQUMsQ0FBQztDQUNweEIsQ0FBQSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsOEdBQThHO0NBQ2xpQixDQUFBLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyw0REFBNEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ2hnQixDQUFBLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0VBQ3ZmLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVM7RUFDOWYsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FB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QUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUM7RUFDbGlCLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3ZmLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxD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LFFBQVE7Q0FDcEIsTUFBTSxRQUFRLEVBQUUsSUFBSTtDQUNwQixNQUFNLEtBQUssRUFBRTtDQUNiLFFBQVEsSUFBSSxFQUFFO0NBQ2QsVUFBVSxJQUFJLEVBQUUsT0FBTztDQUN2QixVQUFVLFFBQVEsRUFBRSxJQUFJO0NBQ3hCLFNBQVM7Q0FDVCxRQUFRLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFO0NBQ25FLFFBQVEsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3JELFFBQVEsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ2hELFFBQVEsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3RELFFBQVEsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQy9DLFFBQVEsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQy9DLFFBQVEsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ2pELFFBQVEsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQzlDLFFBQVEsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ2pELFFBQVEsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3JELFFBQVEsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3JELFFBQVEsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3BELFFBQVEsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDcEUsUUFBUSxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUNwRSxRQUFRLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUNyRCxRQUFRLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUN0RCxRQUFRLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUNoRCxRQUFRLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUN2RCxRQUFRLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUNuRCxRQUFRLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUN0RCxRQUFRLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUN0RCxRQUFRLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUM1RCxRQUFRLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUM1RCxRQUFRLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUNwRCxRQUFRLE1BQU0sRUFBRSxF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QVEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOzs7Q0FBWSxNQUFBLElBQUEsV0FBQSxjQUFBLEdBQVEsbUJBQVIsR0FBUSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQUEzRCxHQUFBLGNBQUEsQ0FBQSxLQUFBLEVBQUEsVUFBQSxHQUFBLGlCQUFBLENBQUEsWUFBQSxFQUFBLENBQUEsS0FBQSxlQUFBLENBQUEsZ0JBQUEsR0FBTyxJQUFDLFVBQVUsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBTmxCLENBQUEsSUFBQSxZQUFBLEdBQUEsYUFBQSxHQUFPLElBQUMsVUFBVSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7SUFBN0IsTUFBMEUsQ0FBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBOzs7Ozs7Q0FBaEMsTUFBQSxJQUFBLFdBQUEsY0FBQSxHQUFRLG1CQUFSLEdBQVEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOzs7Q0FBWSxNQUFBLElBQUEsV0FBQSxjQUFBLEdBQVEsbUJBQVIsR0FBUSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsU0FBQSxDQUFBLENBQUE7Ozs7Ozs7OztDQUEzRCxHQUFBLGNBQUEsQ0FBQSxLQUFBLEVBQUEsVUFBQSxHQUFBLGlCQUFBLENBQUEsWUFBQSxFQUFBLENBQUEsS0FBQSxlQUFBLENBQUEsZ0JBQUEsR0FBTyxJQUFDLFVBQVUsQ0FBQSxDQUFBLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FSZCxDQUFBLElBQUEsWUFBQSxHQUFBLGFBQUEsR0FBTyxJQUFDLFVBQVUsQ0FBQSxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QUFBO0NBQ3pCLEVBQUEsWUFBQSxDQUFBLENBQUEsRUFBQSxPQUFPLEdBQUcsSUFBSSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBdkNmO1NBQ0ssTUFBTSxHQUFBLEVBQUEsQ0FBQTtTQUNOLE1BQU0sR0FBQSxFQUFBLENBQUE7O0NBRUQsSUFBQSxLQUFBLElBQUEsQ0FBQyxJQUFJLFFBQVEsRUFBQTtVQUNoQixPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFBLENBQUUsS0FBSyxFQUFBO0NBQzdDLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQSxVQUFVLENBQUMsSUFBSSxDQUFJLEdBQUEsUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUE7OztVQUVyRCxRQUFRLENBQUMsQ0FBQyxDQUFBLENBQUUsVUFBVSxJQUFJLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFBLENBQUUsVUFBVSxFQUFBOztDQUV6RCxNQUFBLElBQUEsUUFBUSxDQUFDLENBQUMsQ0FBQSxDQUFFLFVBQVUsQ0FBQyxJQUFJLElBQUksVUFBVSxFQUFBO0NBQzNDLE9BQUEsWUFBQSxDQUFBLENBQUEsRUFBQSxRQUFRLENBQUMsQ0FBQyxDQUFBLENBQUUsVUFBVSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUEsVUFBVSxDQUFDLEtBQUssSUFBSSxNQUFNLEdBQUcsSUFBSSxHQUFHLEtBQUssRUFBQSxRQUFBLENBQUEsQ0FBQTs7O0NBRXRGLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQSxHQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQSxVQUFVLENBQUMsS0FBSyxDQUFBOzs7O0NBSXRFLElBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBRSxDQUFDLElBQUssTUFBTSxDQUFBLENBQUE7Q0FDM0IsSUFBQSxNQUFNLENBQUMsTUFBTSxDQUFFLENBQUMsSUFBSyxNQUFNLENBQUEsQ0FBQTs7Ozs7SUFJNUI7S0FDQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQSxDQUFBO0tBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMjJdfQ==


/**
 * This code is added by the rollup-plugin-reloadsite plugin
 * Naturally, this plugin is disabled as soon as you stop watching your source files via the -w flag
 * process.env.ROLLUP_WATCH is used to automatically mute the plugin and this code, as well as the actual ReloadSite server will disappear
 * However, it is better to be explicit in your code and only load the rollup-plugin-reloadsite  plugin in development mode
 *
 * Note: If you have run multiple sources, then you might find this code in multiple files.
 * However, it's effect is limited to only one time as the if condition below should stop all other instances from running
 */

// see if script tag exists
(function () {
  let scriptExists = document.querySelector('script#ReloadSite');

  if (!scriptExists) {
    // get document body
    let body = document.querySelector('body,html');

    if (body) {
      // create tag
      let tag = document.createElement('script');
      tag.src = 'http://127.0.0.1:35729/reloadsite.js';
      tag.id = 'ReloadSite';
      body.append(tag);
    } else {
      console.warn('HTML document has no body or html tag!');
    }
  }
})();
