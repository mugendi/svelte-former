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
	            // https://www.dofactory.com/html/input-attributes
	            props: {
	                name: { type: 'string' },
	                type: inputTypeSchema,
	                value: { type: 'any', optional: true },
	                id: { type: 'string', optional: true },
	                class: { type: 'string', optional: true },
	                style: { type: 'string', optional: true },
	                title: { type: 'string', optional: true },
	                placeholder: { type: 'string', optional: true },
	                autocomplete: {
	                    type: 'string',
	                    optional: true,
	                    enum: ['on' | 'off'],
	                },
	                form: { type: 'string', optional: true },
	                formaction: { type: 'string', optional: true },
	                formtarget: { type: 'string', optional: true },
	                formenctype: { type: 'string', optional: true },
	                formmethod: { type: 'string', optional: true },
	                formnovalidate: { type: 'string', optional: true },
	                accept: { type: 'string', optional: true },
	                pattern: { type: 'string', optional: true },
	                list: { type: 'string', optional: true },
	                dirname: { type: 'string', optional: true },
	                lang: { type: 'string', optional: true },

	                required: { type: 'boolean', optional: true, convert: true },
	                readonly: { type: 'boolean', optional: true, convert: true },
	                disabled: { type: 'boolean', optional: true, convert: true },
	                checked: { type: 'boolean', optional: true, convert: true },
	                hidden: { type: 'boolean', optional: true, convert: true },
	                autofocus: { type: 'boolean', optional: true, convert: true },
	                multiple: { type: 'boolean', optional: true, convert: true },

	                tabindex: { type: 'number', optional: true, convert: true },
	                maxlength: { type: 'number', optional: true, convert: true },
	                size: { type: 'number', optional: true, convert: true },
	                width: { type: 'number', optional: true, convert: true },
	                height: { type: 'number', optional: true, convert: true },
	                min: { type: 'number', optional: true, convert: true },
	                max: { type: 'number', optional: true, convert: true },
	                step: { type: 'number', optional: true, convert: true },
	                cols: { type: 'number', optional: true, convert: true },
	                rows: { type: 'number', optional: true, convert: true },
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
	        classes: {
	            type: 'array',
	            default: ['col-sm-12'],
	            optional: true,
	            items: 'string',
	        },
	        onChange: {
	            type: 'array',
	            optional: true,
	            items: {
	                type: 'object',
	                props: {
	                    value: { type: 'any', optional: true },
	                    set: {
	                        type: 'multi',
	                        rules: [{ type: 'object' }, { type: 'function' }],
	                    },
	                },
	            },
	        },
	        onChangeResets: {
	            type: 'object',
	            optional: true,
	            default: {},
	        },
	        creationMethod: {
	            type: 'string',
	            optional: true,
	            default: 'normal',
	        },
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

	function validateControl(control) {
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
	    validate(control, schema, 'Control[' + control.idx + '] ');
	    return schema;
	}

	function validateControls(controls) {
	    let inputNames = {};
	    let inputIds = {};
	    let control;

	    for (let i in controls) {
	        i = Number(i);

	        control = controls[i];

	        // validate
	        validateControl(control);

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
	            control.attributes.id =
	                'control-' + control.element + '-' + (i + 1);
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
	            valueSchema.type =
	                validationTypes[control.attributes.type] || 'string';
	            valueSchema.optional = false;
	        }
	    }

	    // if min i set
	    if ('min' in control.attributes) {
	        valueSchema.min = control.attributes.min;
	    }
	    // if max is set
	    if ('max' in control.attributes) {
	        valueSchema.max = control.attributes.max;
	    }
	    // if minlength i set
	    if ('minlength' in control.attributes) {
	        valueSchema.min = control.attributes.minlength;
	    }
	    // if maxlength is set
	    if ('maxlength' in control.attributes) {
	        valueSchema.max = control.attributes.maxlength;
	    }

	    // if pattern is set
	    if ('pattern' in control.attributes) {
	        valueSchema.pattern = new RegExp(control.attributes.pattern);
	    }


	    // console.log(JSON.stringify(valueSchema,0,4));

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

	// (67:0) {:else}
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

	// (65:27) 
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

	// (55:29) 
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

	// (31:0) {#if type == "radio"}
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

	// (34:6) {#each control.options as option, i}
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
			if ($$self.$$.dirty & /*control, type*/ 5) {
				{
					$$invalidate(2, type = control.attributes.type);

					// do not have required in hidden fields
					if (type == "hidden") {
						// https://radu.link/fix-invalid-form-control-not-focusable/
						delete control.attributes.required;
					}
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

	// (33:2) {#if control.attributes.placeholder}
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

	// (36:2) {#each control.options as option}
	function create_each_block$1(ctx) {
		let option_1;
		let t_value = (/*option*/ ctx[4].text || /*option*/ ctx[4]) + "";
		let t;
		let option_1_value_value;

		return {
			c() {
				option_1 = element("option");
				t = text(t_value);
				option_1.__value = option_1_value_value = String(/*option*/ ctx[4].value || /*option*/ ctx[4]);
				set_input_value(option_1, option_1.__value);
			},
			m(target, anchor) {
				insert(target, option_1, anchor);
				append(option_1, t);
			},
			p(ctx, dirty) {
				if (dirty & /*control*/ 1 && t_value !== (t_value = (/*option*/ ctx[4].text || /*option*/ ctx[4]) + "")) set_data(t, t_value);

				if (dirty & /*control*/ 1 && option_1_value_value !== (option_1_value_value = String(/*option*/ ctx[4].value || /*option*/ ctx[4]))) {
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

				if (dirty & /*String, control*/ 1) {
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

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*control*/ 1) {
				if (control && control.attributes) {
					$$invalidate(0, control.attributes.value = control.attributes.value || null, control);
					$$invalidate(0, control.attributes.placeholder = control.attributes.placeholder || "Select Value", control);
				}
			}
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


	const currentControl = writable({});
	const Errors = writable({});
	const Values = writable({});

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

	// (76:44) 
	function create_if_block_2(ctx) {
		let textarea;
		let updating_control;
		let current;

		function textarea_control_binding(value) {
			/*textarea_control_binding*/ ctx[5](value);
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

	// (74:42) 
	function create_if_block_1(ctx) {
		let select;
		let updating_control;
		let current;

		function select_control_binding(value) {
			/*select_control_binding*/ ctx[4](value);
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

	// (72:4) {#if control.element == "input"}
	function create_if_block$1(ctx) {
		let input;
		let updating_control;
		let current;

		function input_control_binding(value) {
			/*input_control_binding*/ ctx[3](value);
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

	// (79:6) <svelte:element this={control.element}>
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
		let type;

		function onChange(e, val, element) {
			let value;

			if (e) {
				let el = e.target;
				el.tagName.toLowerCase();
				$$invalidate(1, type = el.type);

				if (el.type == "checkbox") {
					value = el.checked;
				} else {
					value = el.value;
				}
			} else {
				$$invalidate(1, type = control.attributes.type);
				value = val;
			}

			$$invalidate(0, control.attributes.value = value, control);
			validateValue(control);
			currentControl.update(o => control);
		}

		// run onChange if there is a value passed on creation
		onMount(function () {
			if (control.attributes && ("value" in control.attributes || control.attributes.required)) {
				setTimeout(
					() => {
						onChange(null, control.attributes.value, control.element);
					},
					1
				);
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
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*control*/ 1) {
				if (control) {
					// if is a form input and not other element
					if (formInputTypes.indexOf(control.element) > -1) {
						$$invalidate(1, type = control.attributes.type || control.element);
					}

					if (control.creationMethod == "dynamic") {
						// validate value...
						validateValue(control);
					}
				}
			}
		};

		return [
			control,
			type,
			onChange,
			input_control_binding,
			select_control_binding,
			textarea_control_binding
		];
	}

	class Control extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { control: 0 });
		}
	}

	/* src/Main.svelte generated by Svelte v4.2.13 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[12] = list[i];
		child_ctx[13] = list;
		child_ctx[14] = i;
		return child_ctx;
	}

	// (143:0) {#if isReady}
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

	// (147:8) {#each controls as control, i}
	function create_each_block(ctx) {
		let control_1;
		let updating_control;
		let current;

		function control_1_control_binding(value) {
			/*control_1_control_binding*/ ctx[7](value, /*control*/ ctx[12], /*each_value*/ ctx[13], /*i*/ ctx[14]);
		}

		let control_1_props = { idx: /*i*/ ctx[14] + 1 };

		if (/*control*/ ctx[12] !== void 0) {
			control_1_props.control = /*control*/ ctx[12];
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
					control_1_changes.control = /*control*/ ctx[12];
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
		let $currentControl;
		component_subscribe($$self, Errors, $$value => $$invalidate(8, $Errors = $$value));
		component_subscribe($$self, currentControl, $$value => $$invalidate(6, $currentControl = $$value));
		let { controls = [] } = $$props;
		let { method = "POST" } = $$props;
		let { action = "" } = $$props;
		let { failOnError = true } = $$props;
		let isReady = false;
		formatControls();

		function formatControls() {
			let errors = {};
			let values = {};

			for (let i in controls) {
				$$invalidate(0, controls[i].idx = Number(i) + 1, controls);

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

		async function propagateOnChange(control) {
			try {
				if ("onChange" in control === false) {
					return;
				}

				let onChangeObj;
				let setValue;

				// control.onChangeResets = control.onChangeResets || {};
				for (let i in control.onChange) {
					onChangeObj = control.onChange[i];

					if (typeof onChangeObj.set == "function") {
						setValue = await onChangeObj.set();
					} else {
						setValue = await onChangeObj.set;
					}

					if (typeof setValue == "object") {
						// loop through all the names returned by set
						for (let name in setValue) {
							// find control with name
							for (let i in controls) {
								let newControl = null;

								if ("attributes" in controls[i] === false || name !== controls[i].attributes.name) {
									continue;
								}

								// check value if set
								if ("value" in onChangeObj && control.attributes.value !== onChangeObj.value) {
									newControl = control.onChangeResets[name];
								} else {
									// console.log(onChangeObj);
									control.onChangeResets[name] = control.onChangeResets[name] || merge({}, controls[i]);

									newControl = merge(controls[i], setValue[name], // do not change some values such as element & attributes.type
									{
										element: controls[i].element,
										attributes: {
											id: controls[i].attributes.id,
											name: controls[i].attributes.name,
											type: controls[i].attributes.type
										},
										creationMethod: "dynamic"
									});
								}

								if (newControl) {
									// validate
									validateControl(newControl);

									// assign value
									$$invalidate(0, controls[i] = newControl, controls);

									currentControl.update(o => controls[i]);
								}
							}
						}
					}
				}
			} catch(error) {
				throw error;
			}
		}

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
			if ($$self.$$.dirty & /*$currentControl*/ 64) {
				if ($currentControl) {
					propagateOnChange($currentControl);
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
			$currentControl,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ZlbHRlLWZvcm1lci5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvcnVudGltZS9pbnRlcm5hbC91dGlscy5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3J1bnRpbWUvaW50ZXJuYWwvZG9tLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvcnVudGltZS9pbnRlcm5hbC9saWZlY3ljbGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL3NjaGVkdWxlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3J1bnRpbWUvaW50ZXJuYWwvdHJhbnNpdGlvbnMuanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL2VhY2guanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL3NwcmVhZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3J1bnRpbWUvaW50ZXJuYWwvQ29tcG9uZW50LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvc2hhcmVkL3ZlcnNpb24uanMiLCIuLi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9ydW50aW1lL2ludGVybmFsL2Rpc2Nsb3NlLXZlcnNpb24vaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvcm9sbHVwLXBsdWdpbi1zdHlsZXMvZGlzdC9ydW50aW1lL2luamVjdC1jc3MuanMiLCIuLi9ub2RlX21vZHVsZXMvZmFzdGVzdC12YWxpZGF0b3IvZGlzdC9pbmRleC5taW4uanMiLCIuLi9zcmMvbGliL3NjaGVtYS5qcyIsIi4uL3NyYy9saWIvbWVyZ2UuanMiLCIuLi9zcmMvbGliL3V0aWxzLmpzIiwiLi4vc3JjL2xpYi92YWxpZGF0aW9uLmpzIiwiLi4vc3JjL2VsZW1lbnRzL0Vycm9yLnN2ZWx0ZSIsIi4uL3NyYy9lbGVtZW50cy9MYWJlbC5zdmVsdGUiLCIuLi9zcmMvZWxlbWVudHMvY29udHJvbHMvSW5wdXQuc3ZlbHRlIiwiLi4vc3JjL2VsZW1lbnRzL2NvbnRyb2xzL1NlbGVjdC5zdmVsdGUiLCIuLi9zcmMvZWxlbWVudHMvY29udHJvbHMvVGV4dGFyZWEuc3ZlbHRlIiwiLi4vbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvcnVudGltZS9zdG9yZS9pbmRleC5qcyIsIi4uL3NyYy9saWIvc3RvcmUuanMiLCIuLi9zcmMvZWxlbWVudHMvQ29udHJvbC5zdmVsdGUiLCIuLi9zcmMvTWFpbi5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5leHBvcnQgY29uc3QgaWRlbnRpdHkgPSAoeCkgPT4geDtcblxuLyoqXG4gKiBAdGVtcGxhdGUgVFxuICogQHRlbXBsYXRlIFNcbiAqIEBwYXJhbSB7VH0gdGFyXG4gKiBAcGFyYW0ge1N9IHNyY1xuICogQHJldHVybnMge1QgJiBTfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduKHRhciwgc3JjKSB7XG5cdC8vIEB0cy1pZ25vcmVcblx0Zm9yIChjb25zdCBrIGluIHNyYykgdGFyW2tdID0gc3JjW2tdO1xuXHRyZXR1cm4gLyoqIEB0eXBlIHtUICYgU30gKi8gKHRhcik7XG59XG5cbi8vIEFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdGhlbi9pcy1wcm9taXNlL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG4vLyBEaXN0cmlidXRlZCB1bmRlciBNSVQgTGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vdGhlbi9pcy1wcm9taXNlL2Jsb2IvbWFzdGVyL0xJQ0VOU0Vcbi8qKlxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJucyB7dmFsdWUgaXMgUHJvbWlzZUxpa2U8YW55Pn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcblx0cmV0dXJuIChcblx0XHQhIXZhbHVlICYmXG5cdFx0KHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSAmJlxuXHRcdHR5cGVvZiAoLyoqIEB0eXBlIHthbnl9ICovICh2YWx1ZSkudGhlbikgPT09ICdmdW5jdGlvbidcblx0KTtcbn1cblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZF9sb2NhdGlvbihlbGVtZW50LCBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIpIHtcblx0ZWxlbWVudC5fX3N2ZWx0ZV9tZXRhID0ge1xuXHRcdGxvYzogeyBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIgfVxuXHR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuKGZuKSB7XG5cdHJldHVybiBmbigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmxhbmtfb2JqZWN0KCkge1xuXHRyZXR1cm4gT2JqZWN0LmNyZWF0ZShudWxsKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9uW119IGZuc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBydW5fYWxsKGZucykge1xuXHRmbnMuZm9yRWFjaChydW4pO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7YW55fSB0aGluZ1xuICogQHJldHVybnMge3RoaW5nIGlzIEZ1bmN0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcblx0cmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqIEByZXR1cm5zIHtib29sZWFufSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVfbm90X2VxdWFsKGEsIGIpIHtcblx0cmV0dXJuIGEgIT0gYSA/IGIgPT0gYiA6IGEgIT09IGIgfHwgKGEgJiYgdHlwZW9mIGEgPT09ICdvYmplY3QnKSB8fCB0eXBlb2YgYSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxubGV0IHNyY191cmxfZXF1YWxfYW5jaG9yO1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBlbGVtZW50X3NyY1xuICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzcmNfdXJsX2VxdWFsKGVsZW1lbnRfc3JjLCB1cmwpIHtcblx0aWYgKGVsZW1lbnRfc3JjID09PSB1cmwpIHJldHVybiB0cnVlO1xuXHRpZiAoIXNyY191cmxfZXF1YWxfYW5jaG9yKSB7XG5cdFx0c3JjX3VybF9lcXVhbF9hbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cdH1cblx0Ly8gVGhpcyBpcyBhY3R1YWxseSBmYXN0ZXIgdGhhbiBkb2luZyBVUkwoLi4pLmhyZWZcblx0c3JjX3VybF9lcXVhbF9hbmNob3IuaHJlZiA9IHVybDtcblx0cmV0dXJuIGVsZW1lbnRfc3JjID09PSBzcmNfdXJsX2VxdWFsX2FuY2hvci5ocmVmO1xufVxuXG4vKiogQHBhcmFtIHtzdHJpbmd9IHNyY3NldCAqL1xuZnVuY3Rpb24gc3BsaXRfc3Jjc2V0KHNyY3NldCkge1xuXHRyZXR1cm4gc3Jjc2V0LnNwbGl0KCcsJykubWFwKChzcmMpID0+IHNyYy50cmltKCkuc3BsaXQoJyAnKS5maWx0ZXIoQm9vbGVhbikpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7SFRNTFNvdXJjZUVsZW1lbnQgfCBIVE1MSW1hZ2VFbGVtZW50fSBlbGVtZW50X3NyY3NldFxuICogQHBhcmFtIHtzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsfSBzcmNzZXRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3Jjc2V0X3VybF9lcXVhbChlbGVtZW50X3NyY3NldCwgc3Jjc2V0KSB7XG5cdGNvbnN0IGVsZW1lbnRfdXJscyA9IHNwbGl0X3NyY3NldChlbGVtZW50X3NyY3NldC5zcmNzZXQpO1xuXHRjb25zdCB1cmxzID0gc3BsaXRfc3Jjc2V0KHNyY3NldCB8fCAnJyk7XG5cblx0cmV0dXJuIChcblx0XHR1cmxzLmxlbmd0aCA9PT0gZWxlbWVudF91cmxzLmxlbmd0aCAmJlxuXHRcdHVybHMuZXZlcnkoXG5cdFx0XHQoW3VybCwgd2lkdGhdLCBpKSA9PlxuXHRcdFx0XHR3aWR0aCA9PT0gZWxlbWVudF91cmxzW2ldWzFdICYmXG5cdFx0XHRcdC8vIFdlIG5lZWQgdG8gdGVzdCBib3RoIHdheXMgYmVjYXVzZSBWaXRlIHdpbGwgY3JlYXRlIGFuIGEgZnVsbCBVUkwgd2l0aFxuXHRcdFx0XHQvLyBgbmV3IFVSTChhc3NldCwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmYCBmb3IgdGhlIGNsaWVudCB3aGVuIGBiYXNlOiAnLi8nYCwgYW5kIHRoZVxuXHRcdFx0XHQvLyByZWxhdGl2ZSBVUkxzIGluc2lkZSBzcmNzZXQgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IHJlc29sdmVkIHRvIGFic29sdXRlIFVSTHMgYnlcblx0XHRcdFx0Ly8gYnJvd3NlcnMgKGluIGNvbnRyYXN0IHRvIGltZy5zcmMpLiBUaGlzIG1lYW5zIGJvdGggU1NSIGFuZCBET00gY29kZSBjb3VsZFxuXHRcdFx0XHQvLyBjb250YWluIHJlbGF0aXZlIG9yIGFic29sdXRlIFVSTHMuXG5cdFx0XHRcdChzcmNfdXJsX2VxdWFsKGVsZW1lbnRfdXJsc1tpXVswXSwgdXJsKSB8fCBzcmNfdXJsX2VxdWFsKHVybCwgZWxlbWVudF91cmxzW2ldWzBdKSlcblx0XHQpXG5cdCk7XG59XG5cbi8qKiBAcmV0dXJucyB7Ym9vbGVhbn0gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RfZXF1YWwoYSwgYikge1xuXHRyZXR1cm4gYSAhPSBhID8gYiA9PSBiIDogYSAhPT0gYjtcbn1cblxuLyoqIEByZXR1cm5zIHtib29sZWFufSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX2VtcHR5KG9iaikge1xuXHRyZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDA7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZV9zdG9yZShzdG9yZSwgbmFtZSkge1xuXHRpZiAoc3RvcmUgIT0gbnVsbCAmJiB0eXBlb2Ygc3RvcmUuc3Vic2NyaWJlICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGAnJHtuYW1lfScgaXMgbm90IGEgc3RvcmUgd2l0aCBhICdzdWJzY3JpYmUnIG1ldGhvZGApO1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdWJzY3JpYmUoc3RvcmUsIC4uLmNhbGxiYWNrcykge1xuXHRpZiAoc3RvcmUgPT0gbnVsbCkge1xuXHRcdGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG5cdFx0XHRjYWxsYmFjayh1bmRlZmluZWQpO1xuXHRcdH1cblx0XHRyZXR1cm4gbm9vcDtcblx0fVxuXHRjb25zdCB1bnN1YiA9IHN0b3JlLnN1YnNjcmliZSguLi5jYWxsYmFja3MpO1xuXHRyZXR1cm4gdW5zdWIudW5zdWJzY3JpYmUgPyAoKSA9PiB1bnN1Yi51bnN1YnNjcmliZSgpIDogdW5zdWI7XG59XG5cbi8qKlxuICogR2V0IHRoZSBjdXJyZW50IHZhbHVlIGZyb20gYSBzdG9yZSBieSBzdWJzY3JpYmluZyBhbmQgaW1tZWRpYXRlbHkgdW5zdWJzY3JpYmluZy5cbiAqXG4gKiBodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUtc3RvcmUjZ2V0XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtpbXBvcnQoJy4uL3N0b3JlL3B1YmxpYy5qcycpLlJlYWRhYmxlPFQ+fSBzdG9yZVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRfc3RvcmVfdmFsdWUoc3RvcmUpIHtcblx0bGV0IHZhbHVlO1xuXHRzdWJzY3JpYmUoc3RvcmUsIChfKSA9PiAodmFsdWUgPSBfKSkoKTtcblx0cmV0dXJuIHZhbHVlO1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gY29tcG9uZW50X3N1YnNjcmliZShjb21wb25lbnQsIHN0b3JlLCBjYWxsYmFjaykge1xuXHRjb21wb25lbnQuJCQub25fZGVzdHJveS5wdXNoKHN1YnNjcmliZShzdG9yZSwgY2FsbGJhY2spKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9zbG90KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pIHtcblx0aWYgKGRlZmluaXRpb24pIHtcblx0XHRjb25zdCBzbG90X2N0eCA9IGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbik7XG5cdFx0cmV0dXJuIGRlZmluaXRpb25bMF0oc2xvdF9jdHgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbikge1xuXHRyZXR1cm4gZGVmaW5pdGlvblsxXSAmJiBmbiA/IGFzc2lnbigkJHNjb3BlLmN0eC5zbGljZSgpLCBkZWZpbml0aW9uWzFdKGZuKGN0eCkpKSA6ICQkc2NvcGUuY3R4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3Nsb3RfY2hhbmdlcyhkZWZpbml0aW9uLCAkJHNjb3BlLCBkaXJ0eSwgZm4pIHtcblx0aWYgKGRlZmluaXRpb25bMl0gJiYgZm4pIHtcblx0XHRjb25zdCBsZXRzID0gZGVmaW5pdGlvblsyXShmbihkaXJ0eSkpO1xuXHRcdGlmICgkJHNjb3BlLmRpcnR5ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiBsZXRzO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIGxldHMgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRjb25zdCBtZXJnZWQgPSBbXTtcblx0XHRcdGNvbnN0IGxlbiA9IE1hdGgubWF4KCQkc2NvcGUuZGlydHkubGVuZ3RoLCBsZXRzLmxlbmd0aCk7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSArPSAxKSB7XG5cdFx0XHRcdG1lcmdlZFtpXSA9ICQkc2NvcGUuZGlydHlbaV0gfCBsZXRzW2ldO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1lcmdlZDtcblx0XHR9XG5cdFx0cmV0dXJuICQkc2NvcGUuZGlydHkgfCBsZXRzO1xuXHR9XG5cdHJldHVybiAkJHNjb3BlLmRpcnR5O1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlX3Nsb3RfYmFzZShcblx0c2xvdCxcblx0c2xvdF9kZWZpbml0aW9uLFxuXHRjdHgsXG5cdCQkc2NvcGUsXG5cdHNsb3RfY2hhbmdlcyxcblx0Z2V0X3Nsb3RfY29udGV4dF9mblxuKSB7XG5cdGlmIChzbG90X2NoYW5nZXMpIHtcblx0XHRjb25zdCBzbG90X2NvbnRleHQgPSBnZXRfc2xvdF9jb250ZXh0KHNsb3RfZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBnZXRfc2xvdF9jb250ZXh0X2ZuKTtcblx0XHRzbG90LnAoc2xvdF9jb250ZXh0LCBzbG90X2NoYW5nZXMpO1xuXHR9XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVfc2xvdChcblx0c2xvdCxcblx0c2xvdF9kZWZpbml0aW9uLFxuXHRjdHgsXG5cdCQkc2NvcGUsXG5cdGRpcnR5LFxuXHRnZXRfc2xvdF9jaGFuZ2VzX2ZuLFxuXHRnZXRfc2xvdF9jb250ZXh0X2ZuXG4pIHtcblx0Y29uc3Qgc2xvdF9jaGFuZ2VzID0gZ2V0X3Nsb3RfY2hhbmdlcyhzbG90X2RlZmluaXRpb24sICQkc2NvcGUsIGRpcnR5LCBnZXRfc2xvdF9jaGFuZ2VzX2ZuKTtcblx0dXBkYXRlX3Nsb3RfYmFzZShzbG90LCBzbG90X2RlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgc2xvdF9jaGFuZ2VzLCBnZXRfc2xvdF9jb250ZXh0X2ZuKTtcbn1cblxuLyoqIEByZXR1cm5zIHthbnlbXSB8IC0xfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9hbGxfZGlydHlfZnJvbV9zY29wZSgkJHNjb3BlKSB7XG5cdGlmICgkJHNjb3BlLmN0eC5sZW5ndGggPiAzMikge1xuXHRcdGNvbnN0IGRpcnR5ID0gW107XG5cdFx0Y29uc3QgbGVuZ3RoID0gJCRzY29wZS5jdHgubGVuZ3RoIC8gMzI7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdFx0ZGlydHlbaV0gPSAtMTtcblx0XHR9XG5cdFx0cmV0dXJuIGRpcnR5O1xuXHR9XG5cdHJldHVybiAtMTtcbn1cblxuLyoqIEByZXR1cm5zIHt7fX0gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGNsdWRlX2ludGVybmFsX3Byb3BzKHByb3BzKSB7XG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xuXHRmb3IgKGNvbnN0IGsgaW4gcHJvcHMpIGlmIChrWzBdICE9PSAnJCcpIHJlc3VsdFtrXSA9IHByb3BzW2tdO1xuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQHJldHVybnMge3t9fSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVfcmVzdF9wcm9wcyhwcm9wcywga2V5cykge1xuXHRjb25zdCByZXN0ID0ge307XG5cdGtleXMgPSBuZXcgU2V0KGtleXMpO1xuXHRmb3IgKGNvbnN0IGsgaW4gcHJvcHMpIGlmICgha2V5cy5oYXMoaykgJiYga1swXSAhPT0gJyQnKSByZXN0W2tdID0gcHJvcHNba107XG5cdHJldHVybiByZXN0O1xufVxuXG4vKiogQHJldHVybnMge3t9fSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVfc2xvdHMoc2xvdHMpIHtcblx0Y29uc3QgcmVzdWx0ID0ge307XG5cdGZvciAoY29uc3Qga2V5IGluIHNsb3RzKSB7XG5cdFx0cmVzdWx0W2tleV0gPSB0cnVlO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBAcmV0dXJucyB7KHRoaXM6IGFueSwgLi4uYXJnczogYW55W10pID0+IHZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gb25jZShmbikge1xuXHRsZXQgcmFuID0gZmFsc2U7XG5cdHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuXHRcdGlmIChyYW4pIHJldHVybjtcblx0XHRyYW4gPSB0cnVlO1xuXHRcdGZuLmNhbGwodGhpcywgLi4uYXJncyk7XG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBudWxsX3RvX2VtcHR5KHZhbHVlKSB7XG5cdHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldF9zdG9yZV92YWx1ZShzdG9yZSwgcmV0LCB2YWx1ZSkge1xuXHRzdG9yZS5zZXQodmFsdWUpO1xuXHRyZXR1cm4gcmV0O1xufVxuXG5leHBvcnQgY29uc3QgaGFzX3Byb3AgPSAob2JqLCBwcm9wKSA9PiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGlvbl9kZXN0cm95ZXIoYWN0aW9uX3Jlc3VsdCkge1xuXHRyZXR1cm4gYWN0aW9uX3Jlc3VsdCAmJiBpc19mdW5jdGlvbihhY3Rpb25fcmVzdWx0LmRlc3Ryb3kpID8gYWN0aW9uX3Jlc3VsdC5kZXN0cm95IDogbm9vcDtcbn1cblxuLyoqIEBwYXJhbSB7bnVtYmVyIHwgc3RyaW5nfSB2YWx1ZVxuICogQHJldHVybnMge1tudW1iZXIsIHN0cmluZ119XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdF9jc3NfdW5pdCh2YWx1ZSkge1xuXHRjb25zdCBzcGxpdCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUubWF0Y2goL15cXHMqKC0/W1xcZC5dKykoW15cXHNdKilcXHMqJC8pO1xuXHRyZXR1cm4gc3BsaXQgPyBbcGFyc2VGbG9hdChzcGxpdFsxXSksIHNwbGl0WzJdIHx8ICdweCddIDogWy8qKiBAdHlwZSB7bnVtYmVyfSAqLyAodmFsdWUpLCAncHgnXTtcbn1cblxuZXhwb3J0IGNvbnN0IGNvbnRlbnRlZGl0YWJsZV90cnV0aHlfdmFsdWVzID0gWycnLCB0cnVlLCAxLCAndHJ1ZScsICdjb250ZW50ZWRpdGFibGUnXTtcbiIsImltcG9ydCB7IGNvbnRlbnRlZGl0YWJsZV90cnV0aHlfdmFsdWVzLCBoYXNfcHJvcCB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5pbXBvcnQgeyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbiB9IGZyb20gJy4vUmVzaXplT2JzZXJ2ZXJTaW5nbGV0b24uanMnO1xuXG4vLyBUcmFjayB3aGljaCBub2RlcyBhcmUgY2xhaW1lZCBkdXJpbmcgaHlkcmF0aW9uLiBVbmNsYWltZWQgbm9kZXMgY2FuIHRoZW4gYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbi8vIGF0IHRoZSBlbmQgb2YgaHlkcmF0aW9uIHdpdGhvdXQgdG91Y2hpbmcgdGhlIHJlbWFpbmluZyBub2Rlcy5cbmxldCBpc19oeWRyYXRpbmcgPSBmYWxzZTtcblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0X2h5ZHJhdGluZygpIHtcblx0aXNfaHlkcmF0aW5nID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZF9oeWRyYXRpbmcoKSB7XG5cdGlzX2h5ZHJhdGluZyA9IGZhbHNlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7bnVtYmVyfSBsb3dcbiAqIEBwYXJhbSB7bnVtYmVyfSBoaWdoXG4gKiBAcGFyYW0geyhpbmRleDogbnVtYmVyKSA9PiBudW1iZXJ9IGtleVxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiB1cHBlcl9ib3VuZChsb3csIGhpZ2gsIGtleSwgdmFsdWUpIHtcblx0Ly8gUmV0dXJuIGZpcnN0IGluZGV4IG9mIHZhbHVlIGxhcmdlciB0aGFuIGlucHV0IHZhbHVlIGluIHRoZSByYW5nZSBbbG93LCBoaWdoKVxuXHR3aGlsZSAobG93IDwgaGlnaCkge1xuXHRcdGNvbnN0IG1pZCA9IGxvdyArICgoaGlnaCAtIGxvdykgPj4gMSk7XG5cdFx0aWYgKGtleShtaWQpIDw9IHZhbHVlKSB7XG5cdFx0XHRsb3cgPSBtaWQgKyAxO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRoaWdoID0gbWlkO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbG93O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Tm9kZUV4fSB0YXJnZXRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5mdW5jdGlvbiBpbml0X2h5ZHJhdGUodGFyZ2V0KSB7XG5cdGlmICh0YXJnZXQuaHlkcmF0ZV9pbml0KSByZXR1cm47XG5cdHRhcmdldC5oeWRyYXRlX2luaXQgPSB0cnVlO1xuXHQvLyBXZSBrbm93IHRoYXQgYWxsIGNoaWxkcmVuIGhhdmUgY2xhaW1fb3JkZXIgdmFsdWVzIHNpbmNlIHRoZSB1bmNsYWltZWQgaGF2ZSBiZWVuIGRldGFjaGVkIGlmIHRhcmdldCBpcyBub3QgPGhlYWQ+XG5cblx0bGV0IGNoaWxkcmVuID0gLyoqIEB0eXBlIHtBcnJheUxpa2U8Tm9kZUV4Mj59ICovICh0YXJnZXQuY2hpbGROb2Rlcyk7XG5cdC8vIElmIHRhcmdldCBpcyA8aGVhZD4sIHRoZXJlIG1heSBiZSBjaGlsZHJlbiB3aXRob3V0IGNsYWltX29yZGVyXG5cdGlmICh0YXJnZXQubm9kZU5hbWUgPT09ICdIRUFEJykge1xuXHRcdGNvbnN0IG15X2NoaWxkcmVuID0gW107XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0Y29uc3Qgbm9kZSA9IGNoaWxkcmVuW2ldO1xuXHRcdFx0aWYgKG5vZGUuY2xhaW1fb3JkZXIgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRteV9jaGlsZHJlbi5wdXNoKG5vZGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjaGlsZHJlbiA9IG15X2NoaWxkcmVuO1xuXHR9XG5cdC8qXG5cdCAqIFJlb3JkZXIgY2xhaW1lZCBjaGlsZHJlbiBvcHRpbWFsbHkuXG5cdCAqIFdlIGNhbiByZW9yZGVyIGNsYWltZWQgY2hpbGRyZW4gb3B0aW1hbGx5IGJ5IGZpbmRpbmcgdGhlIGxvbmdlc3Qgc3Vic2VxdWVuY2Ugb2Zcblx0ICogbm9kZXMgdGhhdCBhcmUgYWxyZWFkeSBjbGFpbWVkIGluIG9yZGVyIGFuZCBvbmx5IG1vdmluZyB0aGUgcmVzdC4gVGhlIGxvbmdlc3Rcblx0ICogc3Vic2VxdWVuY2Ugb2Ygbm9kZXMgdGhhdCBhcmUgY2xhaW1lZCBpbiBvcmRlciBjYW4gYmUgZm91bmQgYnlcblx0ICogY29tcHV0aW5nIHRoZSBsb25nZXN0IGluY3JlYXNpbmcgc3Vic2VxdWVuY2Ugb2YgLmNsYWltX29yZGVyIHZhbHVlcy5cblx0ICpcblx0ICogVGhpcyBhbGdvcml0aG0gaXMgb3B0aW1hbCBpbiBnZW5lcmF0aW5nIHRoZSBsZWFzdCBhbW91bnQgb2YgcmVvcmRlciBvcGVyYXRpb25zXG5cdCAqIHBvc3NpYmxlLlxuXHQgKlxuXHQgKiBQcm9vZjpcblx0ICogV2Uga25vdyB0aGF0LCBnaXZlbiBhIHNldCBvZiByZW9yZGVyaW5nIG9wZXJhdGlvbnMsIHRoZSBub2RlcyB0aGF0IGRvIG5vdCBtb3ZlXG5cdCAqIGFsd2F5cyBmb3JtIGFuIGluY3JlYXNpbmcgc3Vic2VxdWVuY2UsIHNpbmNlIHRoZXkgZG8gbm90IG1vdmUgYW1vbmcgZWFjaCBvdGhlclxuXHQgKiBtZWFuaW5nIHRoYXQgdGhleSBtdXN0IGJlIGFscmVhZHkgb3JkZXJlZCBhbW9uZyBlYWNoIG90aGVyLiBUaHVzLCB0aGUgbWF4aW1hbFxuXHQgKiBzZXQgb2Ygbm9kZXMgdGhhdCBkbyBub3QgbW92ZSBmb3JtIGEgbG9uZ2VzdCBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlLlxuXHQgKi9cblx0Ly8gQ29tcHV0ZSBsb25nZXN0IGluY3JlYXNpbmcgc3Vic2VxdWVuY2Vcblx0Ly8gbTogc3Vic2VxdWVuY2UgbGVuZ3RoIGogPT4gaW5kZXggayBvZiBzbWFsbGVzdCB2YWx1ZSB0aGF0IGVuZHMgYW4gaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSBvZiBsZW5ndGggalxuXHRjb25zdCBtID0gbmV3IEludDMyQXJyYXkoY2hpbGRyZW4ubGVuZ3RoICsgMSk7XG5cdC8vIFByZWRlY2Vzc29yIGluZGljZXMgKyAxXG5cdGNvbnN0IHAgPSBuZXcgSW50MzJBcnJheShjaGlsZHJlbi5sZW5ndGgpO1xuXHRtWzBdID0gLTE7XG5cdGxldCBsb25nZXN0ID0gMDtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdGNvbnN0IGN1cnJlbnQgPSBjaGlsZHJlbltpXS5jbGFpbV9vcmRlcjtcblx0XHQvLyBGaW5kIHRoZSBsYXJnZXN0IHN1YnNlcXVlbmNlIGxlbmd0aCBzdWNoIHRoYXQgaXQgZW5kcyBpbiBhIHZhbHVlIGxlc3MgdGhhbiBvdXIgY3VycmVudCB2YWx1ZVxuXHRcdC8vIHVwcGVyX2JvdW5kIHJldHVybnMgZmlyc3QgZ3JlYXRlciB2YWx1ZSwgc28gd2Ugc3VidHJhY3Qgb25lXG5cdFx0Ly8gd2l0aCBmYXN0IHBhdGggZm9yIHdoZW4gd2UgYXJlIG9uIHRoZSBjdXJyZW50IGxvbmdlc3Qgc3Vic2VxdWVuY2Vcblx0XHRjb25zdCBzZXFfbGVuID1cblx0XHRcdChsb25nZXN0ID4gMCAmJiBjaGlsZHJlblttW2xvbmdlc3RdXS5jbGFpbV9vcmRlciA8PSBjdXJyZW50XG5cdFx0XHRcdD8gbG9uZ2VzdCArIDFcblx0XHRcdFx0OiB1cHBlcl9ib3VuZCgxLCBsb25nZXN0LCAoaWR4KSA9PiBjaGlsZHJlblttW2lkeF1dLmNsYWltX29yZGVyLCBjdXJyZW50KSkgLSAxO1xuXHRcdHBbaV0gPSBtW3NlcV9sZW5dICsgMTtcblx0XHRjb25zdCBuZXdfbGVuID0gc2VxX2xlbiArIDE7XG5cdFx0Ly8gV2UgY2FuIGd1YXJhbnRlZSB0aGF0IGN1cnJlbnQgaXMgdGhlIHNtYWxsZXN0IHZhbHVlLiBPdGhlcndpc2UsIHdlIHdvdWxkIGhhdmUgZ2VuZXJhdGVkIGEgbG9uZ2VyIHNlcXVlbmNlLlxuXHRcdG1bbmV3X2xlbl0gPSBpO1xuXHRcdGxvbmdlc3QgPSBNYXRoLm1heChuZXdfbGVuLCBsb25nZXN0KTtcblx0fVxuXHQvLyBUaGUgbG9uZ2VzdCBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlIG9mIG5vZGVzIChpbml0aWFsbHkgcmV2ZXJzZWQpXG5cblx0LyoqXG5cdCAqIEB0eXBlIHtOb2RlRXgyW119XG5cdCAqL1xuXHRjb25zdCBsaXMgPSBbXTtcblx0Ly8gVGhlIHJlc3Qgb2YgdGhlIG5vZGVzLCBub2RlcyB0aGF0IHdpbGwgYmUgbW92ZWRcblxuXHQvKipcblx0ICogQHR5cGUge05vZGVFeDJbXX1cblx0ICovXG5cdGNvbnN0IHRvX21vdmUgPSBbXTtcblx0bGV0IGxhc3QgPSBjaGlsZHJlbi5sZW5ndGggLSAxO1xuXHRmb3IgKGxldCBjdXIgPSBtW2xvbmdlc3RdICsgMTsgY3VyICE9IDA7IGN1ciA9IHBbY3VyIC0gMV0pIHtcblx0XHRsaXMucHVzaChjaGlsZHJlbltjdXIgLSAxXSk7XG5cdFx0Zm9yICg7IGxhc3QgPj0gY3VyOyBsYXN0LS0pIHtcblx0XHRcdHRvX21vdmUucHVzaChjaGlsZHJlbltsYXN0XSk7XG5cdFx0fVxuXHRcdGxhc3QtLTtcblx0fVxuXHRmb3IgKDsgbGFzdCA+PSAwOyBsYXN0LS0pIHtcblx0XHR0b19tb3ZlLnB1c2goY2hpbGRyZW5bbGFzdF0pO1xuXHR9XG5cdGxpcy5yZXZlcnNlKCk7XG5cdC8vIFdlIHNvcnQgdGhlIG5vZGVzIGJlaW5nIG1vdmVkIHRvIGd1YXJhbnRlZSB0aGF0IHRoZWlyIGluc2VydGlvbiBvcmRlciBtYXRjaGVzIHRoZSBjbGFpbSBvcmRlclxuXHR0b19tb3ZlLnNvcnQoKGEsIGIpID0+IGEuY2xhaW1fb3JkZXIgLSBiLmNsYWltX29yZGVyKTtcblx0Ly8gRmluYWxseSwgd2UgbW92ZSB0aGUgbm9kZXNcblx0Zm9yIChsZXQgaSA9IDAsIGogPSAwOyBpIDwgdG9fbW92ZS5sZW5ndGg7IGkrKykge1xuXHRcdHdoaWxlIChqIDwgbGlzLmxlbmd0aCAmJiB0b19tb3ZlW2ldLmNsYWltX29yZGVyID49IGxpc1tqXS5jbGFpbV9vcmRlcikge1xuXHRcdFx0aisrO1xuXHRcdH1cblx0XHRjb25zdCBhbmNob3IgPSBqIDwgbGlzLmxlbmd0aCA/IGxpc1tqXSA6IG51bGw7XG5cdFx0dGFyZ2V0Lmluc2VydEJlZm9yZSh0b19tb3ZlW2ldLCBhbmNob3IpO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmQodGFyZ2V0LCBub2RlKSB7XG5cdHRhcmdldC5hcHBlbmRDaGlsZChub2RlKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtzdHJpbmd9IHN0eWxlX3NoZWV0X2lkXG4gKiBAcGFyYW0ge3N0cmluZ30gc3R5bGVzXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZF9zdHlsZXModGFyZ2V0LCBzdHlsZV9zaGVldF9pZCwgc3R5bGVzKSB7XG5cdGNvbnN0IGFwcGVuZF9zdHlsZXNfdG8gPSBnZXRfcm9vdF9mb3Jfc3R5bGUodGFyZ2V0KTtcblx0aWYgKCFhcHBlbmRfc3R5bGVzX3RvLmdldEVsZW1lbnRCeUlkKHN0eWxlX3NoZWV0X2lkKSkge1xuXHRcdGNvbnN0IHN0eWxlID0gZWxlbWVudCgnc3R5bGUnKTtcblx0XHRzdHlsZS5pZCA9IHN0eWxlX3NoZWV0X2lkO1xuXHRcdHN0eWxlLnRleHRDb250ZW50ID0gc3R5bGVzO1xuXHRcdGFwcGVuZF9zdHlsZXNoZWV0KGFwcGVuZF9zdHlsZXNfdG8sIHN0eWxlKTtcblx0fVxufVxuXG4vKipcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybnMge1NoYWRvd1Jvb3QgfCBEb2N1bWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9yb290X2Zvcl9zdHlsZShub2RlKSB7XG5cdGlmICghbm9kZSkgcmV0dXJuIGRvY3VtZW50O1xuXHRjb25zdCByb290ID0gbm9kZS5nZXRSb290Tm9kZSA/IG5vZGUuZ2V0Um9vdE5vZGUoKSA6IG5vZGUub3duZXJEb2N1bWVudDtcblx0aWYgKHJvb3QgJiYgLyoqIEB0eXBlIHtTaGFkb3dSb290fSAqLyAocm9vdCkuaG9zdCkge1xuXHRcdHJldHVybiAvKiogQHR5cGUge1NoYWRvd1Jvb3R9ICovIChyb290KTtcblx0fVxuXHRyZXR1cm4gbm9kZS5vd25lckRvY3VtZW50O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybnMge0NTU1N0eWxlU2hlZXR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRfZW1wdHlfc3R5bGVzaGVldChub2RlKSB7XG5cdGNvbnN0IHN0eWxlX2VsZW1lbnQgPSBlbGVtZW50KCdzdHlsZScpO1xuXHQvLyBGb3IgdHJhbnNpdGlvbnMgdG8gd29yayB3aXRob3V0ICdzdHlsZS1zcmM6IHVuc2FmZS1pbmxpbmUnIENvbnRlbnQgU2VjdXJpdHkgUG9saWN5LFxuXHQvLyB0aGVzZSBlbXB0eSB0YWdzIG5lZWQgdG8gYmUgYWxsb3dlZCB3aXRoIGEgaGFzaCBhcyBhIHdvcmthcm91bmQgdW50aWwgd2UgbW92ZSB0byB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJLlxuXHQvLyBVc2luZyB0aGUgaGFzaCBmb3IgdGhlIGVtcHR5IHN0cmluZyAoZm9yIGFuIGVtcHR5IHRhZykgd29ya3MgaW4gYWxsIGJyb3dzZXJzIGV4Y2VwdCBTYWZhcmkuXG5cdC8vIFNvIGFzIGEgd29ya2Fyb3VuZCBmb3IgdGhlIHdvcmthcm91bmQsIHdoZW4gd2UgYXBwZW5kIGVtcHR5IHN0eWxlIHRhZ3Mgd2Ugc2V0IHRoZWlyIGNvbnRlbnQgdG8gLyogZW1wdHkgKi8uXG5cdC8vIFRoZSBoYXNoICdzaGEyNTYtOU9sTk8wRE5FZWFWekhMNFJad0NMc0JIQThXQlE4dG9CcC80RjVYVjJuYz0nIHdpbGwgdGhlbiB3b3JrIGV2ZW4gaW4gU2FmYXJpLlxuXHRzdHlsZV9lbGVtZW50LnRleHRDb250ZW50ID0gJy8qIGVtcHR5ICovJztcblx0YXBwZW5kX3N0eWxlc2hlZXQoZ2V0X3Jvb3RfZm9yX3N0eWxlKG5vZGUpLCBzdHlsZV9lbGVtZW50KTtcblx0cmV0dXJuIHN0eWxlX2VsZW1lbnQuc2hlZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtTaGFkb3dSb290IHwgRG9jdW1lbnR9IG5vZGVcbiAqIEBwYXJhbSB7SFRNTFN0eWxlRWxlbWVudH0gc3R5bGVcbiAqIEByZXR1cm5zIHtDU1NTdHlsZVNoZWV0fVxuICovXG5mdW5jdGlvbiBhcHBlbmRfc3R5bGVzaGVldChub2RlLCBzdHlsZSkge1xuXHRhcHBlbmQoLyoqIEB0eXBlIHtEb2N1bWVudH0gKi8gKG5vZGUpLmhlYWQgfHwgbm9kZSwgc3R5bGUpO1xuXHRyZXR1cm4gc3R5bGUuc2hlZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtOb2RlRXh9IHRhcmdldFxuICogQHBhcmFtIHtOb2RlRXh9IG5vZGVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kX2h5ZHJhdGlvbih0YXJnZXQsIG5vZGUpIHtcblx0aWYgKGlzX2h5ZHJhdGluZykge1xuXHRcdGluaXRfaHlkcmF0ZSh0YXJnZXQpO1xuXHRcdGlmIChcblx0XHRcdHRhcmdldC5hY3R1YWxfZW5kX2NoaWxkID09PSB1bmRlZmluZWQgfHxcblx0XHRcdCh0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCAhPT0gbnVsbCAmJiB0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZC5wYXJlbnROb2RlICE9PSB0YXJnZXQpXG5cdFx0KSB7XG5cdFx0XHR0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCA9IHRhcmdldC5maXJzdENoaWxkO1xuXHRcdH1cblx0XHQvLyBTa2lwIG5vZGVzIG9mIHVuZGVmaW5lZCBvcmRlcmluZ1xuXHRcdHdoaWxlICh0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCAhPT0gbnVsbCAmJiB0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZC5jbGFpbV9vcmRlciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCA9IHRhcmdldC5hY3R1YWxfZW5kX2NoaWxkLm5leHRTaWJsaW5nO1xuXHRcdH1cblx0XHRpZiAobm9kZSAhPT0gdGFyZ2V0LmFjdHVhbF9lbmRfY2hpbGQpIHtcblx0XHRcdC8vIFdlIG9ubHkgaW5zZXJ0IGlmIHRoZSBvcmRlcmluZyBvZiB0aGlzIG5vZGUgc2hvdWxkIGJlIG1vZGlmaWVkIG9yIHRoZSBwYXJlbnQgbm9kZSBpcyBub3QgdGFyZ2V0XG5cdFx0XHRpZiAobm9kZS5jbGFpbV9vcmRlciAhPT0gdW5kZWZpbmVkIHx8IG5vZGUucGFyZW50Tm9kZSAhPT0gdGFyZ2V0KSB7XG5cdFx0XHRcdHRhcmdldC5pbnNlcnRCZWZvcmUobm9kZSwgdGFyZ2V0LmFjdHVhbF9lbmRfY2hpbGQpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuYWN0dWFsX2VuZF9jaGlsZCA9IG5vZGUubmV4dFNpYmxpbmc7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGFyZ2V0IHx8IG5vZGUubmV4dFNpYmxpbmcgIT09IG51bGwpIHtcblx0XHR0YXJnZXQuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcGFyYW0ge05vZGV9IFthbmNob3JdXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc2VydCh0YXJnZXQsIG5vZGUsIGFuY2hvcikge1xuXHR0YXJnZXQuaW5zZXJ0QmVmb3JlKG5vZGUsIGFuY2hvciB8fCBudWxsKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGVFeH0gdGFyZ2V0XG4gKiBAcGFyYW0ge05vZGVFeH0gbm9kZVxuICogQHBhcmFtIHtOb2RlRXh9IFthbmNob3JdXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc2VydF9oeWRyYXRpb24odGFyZ2V0LCBub2RlLCBhbmNob3IpIHtcblx0aWYgKGlzX2h5ZHJhdGluZyAmJiAhYW5jaG9yKSB7XG5cdFx0YXBwZW5kX2h5ZHJhdGlvbih0YXJnZXQsIG5vZGUpO1xuXHR9IGVsc2UgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGFyZ2V0IHx8IG5vZGUubmV4dFNpYmxpbmcgIT0gYW5jaG9yKSB7XG5cdFx0dGFyZ2V0Lmluc2VydEJlZm9yZShub2RlLCBhbmNob3IgfHwgbnVsbCk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0YWNoKG5vZGUpIHtcblx0aWYgKG5vZGUucGFyZW50Tm9kZSkge1xuXHRcdG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcblx0fVxufVxuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc3Ryb3lfZWFjaChpdGVyYXRpb25zLCBkZXRhY2hpbmcpIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpdGVyYXRpb25zLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0aWYgKGl0ZXJhdGlvbnNbaV0pIGl0ZXJhdGlvbnNbaV0uZChkZXRhY2hpbmcpO1xuXHR9XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIHtrZXlvZiBIVE1MRWxlbWVudFRhZ05hbWVNYXB9IEtcbiAqIEBwYXJhbSB7S30gbmFtZVxuICogQHJldHVybnMge0hUTUxFbGVtZW50VGFnTmFtZU1hcFtLXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnQobmFtZSkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKTtcbn1cblxuLyoqXG4gKiBAdGVtcGxhdGUge2tleW9mIEhUTUxFbGVtZW50VGFnTmFtZU1hcH0gS1xuICogQHBhcmFtIHtLfSBuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gaXNcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudFRhZ05hbWVNYXBbS119XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50X2lzKG5hbWUsIGlzKSB7XG5cdHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUsIHsgaXMgfSk7XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFRcbiAqIEB0ZW1wbGF0ZSB7a2V5b2YgVH0gS1xuICogQHBhcmFtIHtUfSBvYmpcbiAqIEBwYXJhbSB7S1tdfSBleGNsdWRlXG4gKiBAcmV0dXJucyB7UGljazxULCBFeGNsdWRlPGtleW9mIFQsIEs+Pn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9iamVjdF93aXRob3V0X3Byb3BlcnRpZXMob2JqLCBleGNsdWRlKSB7XG5cdGNvbnN0IHRhcmdldCA9IC8qKiBAdHlwZSB7UGljazxULCBFeGNsdWRlPGtleW9mIFQsIEs+Pn0gKi8gKHt9KTtcblx0Zm9yIChjb25zdCBrIGluIG9iaikge1xuXHRcdGlmIChcblx0XHRcdGhhc19wcm9wKG9iaiwgaykgJiZcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdGV4Y2x1ZGUuaW5kZXhPZihrKSA9PT0gLTFcblx0XHQpIHtcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdHRhcmdldFtrXSA9IG9ialtrXTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHRhcmdldDtcbn1cblxuLyoqXG4gKiBAdGVtcGxhdGUge2tleW9mIFNWR0VsZW1lbnRUYWdOYW1lTWFwfSBLXG4gKiBAcGFyYW0ge0t9IG5hbWVcbiAqIEByZXR1cm5zIHtTVkdFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ZnX2VsZW1lbnQobmFtZSkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIG5hbWUpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhXG4gKiBAcmV0dXJucyB7VGV4dH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHQoZGF0YSkge1xuXHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSk7XG59XG5cbi8qKlxuICogQHJldHVybnMge1RleHR9ICovXG5leHBvcnQgZnVuY3Rpb24gc3BhY2UoKSB7XG5cdHJldHVybiB0ZXh0KCcgJyk7XG59XG5cbi8qKlxuICogQHJldHVybnMge1RleHR9ICovXG5leHBvcnQgZnVuY3Rpb24gZW1wdHkoKSB7XG5cdHJldHVybiB0ZXh0KCcnKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gY29udGVudFxuICogQHJldHVybnMge0NvbW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tZW50KGNvbnRlbnQpIHtcblx0cmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoY29udGVudCk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtFdmVudFRhcmdldH0gbm9kZVxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0V2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3R9IGhhbmRsZXJcbiAqIEBwYXJhbSB7Ym9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zIHwgRXZlbnRMaXN0ZW5lck9wdGlvbnN9IFtvcHRpb25zXVxuICogQHJldHVybnMgeygpID0+IHZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaXN0ZW4obm9kZSwgZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMpIHtcblx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcblx0cmV0dXJuICgpID0+IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQHJldHVybnMgeyhldmVudDogYW55KSA9PiBhbnl9ICovXG5leHBvcnQgZnVuY3Rpb24gcHJldmVudF9kZWZhdWx0KGZuKSB7XG5cdHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdC8vIEB0cy1pZ25vcmVcblx0XHRyZXR1cm4gZm4uY2FsbCh0aGlzLCBldmVudCk7XG5cdH07XG59XG5cbi8qKlxuICogQHJldHVybnMgeyhldmVudDogYW55KSA9PiBhbnl9ICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcF9wcm9wYWdhdGlvbihmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gQHRzLWlnbm9yZVxuXHRcdHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcblx0fTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7KGV2ZW50OiBhbnkpID0+IGFueX0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wX2ltbWVkaWF0ZV9wcm9wYWdhdGlvbihmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0Ly8gQHRzLWlnbm9yZVxuXHRcdHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcblx0fTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7KGV2ZW50OiBhbnkpID0+IHZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gc2VsZihmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0Ly8gQHRzLWlnbm9yZVxuXHRcdGlmIChldmVudC50YXJnZXQgPT09IHRoaXMpIGZuLmNhbGwodGhpcywgZXZlbnQpO1xuXHR9O1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHsoZXZlbnQ6IGFueSkgPT4gdm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cnVzdGVkKGZuKSB7XG5cdHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHQvLyBAdHMtaWdub3JlXG5cdFx0aWYgKGV2ZW50LmlzVHJ1c3RlZCkgZm4uY2FsbCh0aGlzLCBldmVudCk7XG5cdH07XG59XG5cbi8qKlxuICogQHBhcmFtIHtFbGVtZW50fSBub2RlXG4gKiBAcGFyYW0ge3N0cmluZ30gYXR0cmlidXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gW3ZhbHVlXVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdHRyKG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcblx0aWYgKHZhbHVlID09IG51bGwpIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG5cdGVsc2UgaWYgKG5vZGUuZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IHZhbHVlKSBub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cbi8qKlxuICogTGlzdCBvZiBhdHRyaWJ1dGVzIHRoYXQgc2hvdWxkIGFsd2F5cyBiZSBzZXQgdGhyb3VnaCB0aGUgYXR0ciBtZXRob2QsXG4gKiBiZWNhdXNlIHVwZGF0aW5nIHRoZW0gdGhyb3VnaCB0aGUgcHJvcGVydHkgc2V0dGVyIGRvZXNuJ3Qgd29yayByZWxpYWJseS5cbiAqIEluIHRoZSBleGFtcGxlIG9mIGB3aWR0aGAvYGhlaWdodGAsIHRoZSBwcm9ibGVtIGlzIHRoYXQgdGhlIHNldHRlciBvbmx5XG4gKiBhY2NlcHRzIG51bWVyaWMgdmFsdWVzLCBidXQgdGhlIGF0dHJpYnV0ZSBjYW4gYWxzbyBiZSBzZXQgdG8gYSBzdHJpbmcgbGlrZSBgNTAlYC5cbiAqIElmIHRoaXMgbGlzdCBiZWNvbWVzIHRvbyBiaWcsIHJldGhpbmsgdGhpcyBhcHByb2FjaC5cbiAqL1xuY29uc3QgYWx3YXlzX3NldF90aHJvdWdoX3NldF9hdHRyaWJ1dGUgPSBbJ3dpZHRoJywgJ2hlaWdodCddO1xuXG4vKipcbiAqIEBwYXJhbSB7RWxlbWVudCAmIEVsZW1lbnRDU1NJbmxpbmVTdHlsZX0gbm9kZVxuICogQHBhcmFtIHt7IFt4OiBzdHJpbmddOiBzdHJpbmcgfX0gYXR0cmlidXRlc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfYXR0cmlidXRlcyhub2RlLCBhdHRyaWJ1dGVzKSB7XG5cdC8vIEB0cy1pZ25vcmVcblx0Y29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhub2RlLl9fcHJvdG9fXyk7XG5cdGZvciAoY29uc3Qga2V5IGluIGF0dHJpYnV0ZXMpIHtcblx0XHRpZiAoYXR0cmlidXRlc1trZXldID09IG51bGwpIHtcblx0XHRcdG5vZGUucmVtb3ZlQXR0cmlidXRlKGtleSk7XG5cdFx0fSBlbHNlIGlmIChrZXkgPT09ICdzdHlsZScpIHtcblx0XHRcdG5vZGUuc3R5bGUuY3NzVGV4dCA9IGF0dHJpYnV0ZXNba2V5XTtcblx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ19fdmFsdWUnKSB7XG5cdFx0XHQvKiogQHR5cGUge2FueX0gKi8gKG5vZGUpLnZhbHVlID0gbm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuXHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRkZXNjcmlwdG9yc1trZXldICYmXG5cdFx0XHRkZXNjcmlwdG9yc1trZXldLnNldCAmJlxuXHRcdFx0YWx3YXlzX3NldF90aHJvdWdoX3NldF9hdHRyaWJ1dGUuaW5kZXhPZihrZXkpID09PSAtMVxuXHRcdCkge1xuXHRcdFx0bm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhdHRyKG5vZGUsIGtleSwgYXR0cmlidXRlc1trZXldKTtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge0VsZW1lbnQgJiBFbGVtZW50Q1NTSW5saW5lU3R5bGV9IG5vZGVcbiAqIEBwYXJhbSB7eyBbeDogc3RyaW5nXTogc3RyaW5nIH19IGF0dHJpYnV0ZXNcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X3N2Z19hdHRyaWJ1dGVzKG5vZGUsIGF0dHJpYnV0ZXMpIHtcblx0Zm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuXHRcdGF0dHIobm9kZSwga2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtSZWNvcmQ8c3RyaW5nLCB1bmtub3duPn0gZGF0YV9tYXBcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2N1c3RvbV9lbGVtZW50X2RhdGFfbWFwKG5vZGUsIGRhdGFfbWFwKSB7XG5cdE9iamVjdC5rZXlzKGRhdGFfbWFwKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRzZXRfY3VzdG9tX2VsZW1lbnRfZGF0YShub2RlLCBrZXksIGRhdGFfbWFwW2tleV0pO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfY3VzdG9tX2VsZW1lbnRfZGF0YShub2RlLCBwcm9wLCB2YWx1ZSkge1xuXHRjb25zdCBsb3dlciA9IHByb3AudG9Mb3dlckNhc2UoKTsgLy8gZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggZXhpc3RpbmcgYmVoYXZpb3Igd2UgZG8gbG93ZXJjYXNlIGZpcnN0XG5cdGlmIChsb3dlciBpbiBub2RlKSB7XG5cdFx0bm9kZVtsb3dlcl0gPSB0eXBlb2Ygbm9kZVtsb3dlcl0gPT09ICdib29sZWFuJyAmJiB2YWx1ZSA9PT0gJycgPyB0cnVlIDogdmFsdWU7XG5cdH0gZWxzZSBpZiAocHJvcCBpbiBub2RlKSB7XG5cdFx0bm9kZVtwcm9wXSA9IHR5cGVvZiBub2RlW3Byb3BdID09PSAnYm9vbGVhbicgJiYgdmFsdWUgPT09ICcnID8gdHJ1ZSA6IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdGF0dHIobm9kZSwgcHJvcCwgdmFsdWUpO1xuXHR9XG59XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2R5bmFtaWNfZWxlbWVudF9kYXRhKHRhZykge1xuXHRyZXR1cm4gLy0vLnRlc3QodGFnKSA/IHNldF9jdXN0b21fZWxlbWVudF9kYXRhX21hcCA6IHNldF9hdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24geGxpbmtfYXR0cihub2RlLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG5cdG5vZGUuc2V0QXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBub2RlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3N2ZWx0ZV9kYXRhc2V0KG5vZGUpIHtcblx0cmV0dXJuIG5vZGUuZGF0YXNldC5zdmVsdGVIO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHt1bmtub3duW119ICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X2JpbmRpbmdfZ3JvdXBfdmFsdWUoZ3JvdXAsIF9fdmFsdWUsIGNoZWNrZWQpIHtcblx0Y29uc3QgdmFsdWUgPSBuZXcgU2V0KCk7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXAubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRpZiAoZ3JvdXBbaV0uY2hlY2tlZCkgdmFsdWUuYWRkKGdyb3VwW2ldLl9fdmFsdWUpO1xuXHR9XG5cdGlmICghY2hlY2tlZCkge1xuXHRcdHZhbHVlLmRlbGV0ZShfX3ZhbHVlKTtcblx0fVxuXHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtIVE1MSW5wdXRFbGVtZW50W119IGdyb3VwXG4gKiBAcmV0dXJucyB7eyBwKC4uLmlucHV0czogSFRNTElucHV0RWxlbWVudFtdKTogdm9pZDsgcigpOiB2b2lkOyB9fVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdF9iaW5kaW5nX2dyb3VwKGdyb3VwKSB7XG5cdC8qKlxuXHQgKiBAdHlwZSB7SFRNTElucHV0RWxlbWVudFtdfSAqL1xuXHRsZXQgX2lucHV0cztcblx0cmV0dXJuIHtcblx0XHQvKiBwdXNoICovIHAoLi4uaW5wdXRzKSB7XG5cdFx0XHRfaW5wdXRzID0gaW5wdXRzO1xuXHRcdFx0X2lucHV0cy5mb3JFYWNoKChpbnB1dCkgPT4gZ3JvdXAucHVzaChpbnB1dCkpO1xuXHRcdH0sXG5cdFx0LyogcmVtb3ZlICovIHIoKSB7XG5cdFx0XHRfaW5wdXRzLmZvckVhY2goKGlucHV0KSA9PiBncm91cC5zcGxpY2UoZ3JvdXAuaW5kZXhPZihpbnB1dCksIDEpKTtcblx0XHR9XG5cdH07XG59XG5cbi8qKlxuICogQHBhcmFtIHtudW1iZXJbXX0gaW5kZXhlc1xuICogQHJldHVybnMge3sgdShuZXdfaW5kZXhlczogbnVtYmVyW10pOiB2b2lkOyBwKC4uLmlucHV0czogSFRNTElucHV0RWxlbWVudFtdKTogdm9pZDsgcjogKCkgPT4gdm9pZDsgfX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRfYmluZGluZ19ncm91cF9keW5hbWljKGdyb3VwLCBpbmRleGVzKSB7XG5cdC8qKlxuXHQgKiBAdHlwZSB7SFRNTElucHV0RWxlbWVudFtdfSAqL1xuXHRsZXQgX2dyb3VwID0gZ2V0X2JpbmRpbmdfZ3JvdXAoZ3JvdXApO1xuXG5cdC8qKlxuXHQgKiBAdHlwZSB7SFRNTElucHV0RWxlbWVudFtdfSAqL1xuXHRsZXQgX2lucHV0cztcblxuXHRmdW5jdGlvbiBnZXRfYmluZGluZ19ncm91cChncm91cCkge1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXhlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Z3JvdXAgPSBncm91cFtpbmRleGVzW2ldXSA9IGdyb3VwW2luZGV4ZXNbaV1dIHx8IFtdO1xuXHRcdH1cblx0XHRyZXR1cm4gZ3JvdXA7XG5cdH1cblxuXHQvKipcblx0ICogQHJldHVybnMge3ZvaWR9ICovXG5cdGZ1bmN0aW9uIHB1c2goKSB7XG5cdFx0X2lucHV0cy5mb3JFYWNoKChpbnB1dCkgPT4gX2dyb3VwLnB1c2goaW5wdXQpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcmV0dXJucyB7dm9pZH0gKi9cblx0ZnVuY3Rpb24gcmVtb3ZlKCkge1xuXHRcdF9pbnB1dHMuZm9yRWFjaCgoaW5wdXQpID0+IF9ncm91cC5zcGxpY2UoX2dyb3VwLmluZGV4T2YoaW5wdXQpLCAxKSk7XG5cdH1cblx0cmV0dXJuIHtcblx0XHQvKiB1cGRhdGUgKi8gdShuZXdfaW5kZXhlcykge1xuXHRcdFx0aW5kZXhlcyA9IG5ld19pbmRleGVzO1xuXHRcdFx0Y29uc3QgbmV3X2dyb3VwID0gZ2V0X2JpbmRpbmdfZ3JvdXAoZ3JvdXApO1xuXHRcdFx0aWYgKG5ld19ncm91cCAhPT0gX2dyb3VwKSB7XG5cdFx0XHRcdHJlbW92ZSgpO1xuXHRcdFx0XHRfZ3JvdXAgPSBuZXdfZ3JvdXA7XG5cdFx0XHRcdHB1c2goKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdC8qIHB1c2ggKi8gcCguLi5pbnB1dHMpIHtcblx0XHRcdF9pbnB1dHMgPSBpbnB1dHM7XG5cdFx0XHRwdXNoKCk7XG5cdFx0fSxcblx0XHQvKiByZW1vdmUgKi8gcjogcmVtb3ZlXG5cdH07XG59XG5cbi8qKiBAcmV0dXJucyB7bnVtYmVyfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvX251bWJlcih2YWx1ZSkge1xuXHRyZXR1cm4gdmFsdWUgPT09ICcnID8gbnVsbCA6ICt2YWx1ZTtcbn1cblxuLyoqIEByZXR1cm5zIHthbnlbXX0gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aW1lX3Jhbmdlc190b19hcnJheShyYW5nZXMpIHtcblx0Y29uc3QgYXJyYXkgPSBbXTtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCByYW5nZXMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRhcnJheS5wdXNoKHsgc3RhcnQ6IHJhbmdlcy5zdGFydChpKSwgZW5kOiByYW5nZXMuZW5kKGkpIH0pO1xuXHR9XG5cdHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtDaGlsZE5vZGVbXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoaWxkcmVuKGVsZW1lbnQpIHtcblx0cmV0dXJuIEFycmF5LmZyb20oZWxlbWVudC5jaGlsZE5vZGVzKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0NoaWxkTm9kZUFycmF5fSBub2Rlc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmZ1bmN0aW9uIGluaXRfY2xhaW1faW5mbyhub2Rlcykge1xuXHRpZiAobm9kZXMuY2xhaW1faW5mbyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0bm9kZXMuY2xhaW1faW5mbyA9IHsgbGFzdF9pbmRleDogMCwgdG90YWxfY2xhaW1lZDogMCB9O1xuXHR9XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIHtDaGlsZE5vZGVFeH0gUlxuICogQHBhcmFtIHtDaGlsZE5vZGVBcnJheX0gbm9kZXNcbiAqIEBwYXJhbSB7KG5vZGU6IENoaWxkTm9kZUV4KSA9PiBub2RlIGlzIFJ9IHByZWRpY2F0ZVxuICogQHBhcmFtIHsobm9kZTogQ2hpbGROb2RlRXgpID0+IENoaWxkTm9kZUV4IHwgdW5kZWZpbmVkfSBwcm9jZXNzX25vZGVcbiAqIEBwYXJhbSB7KCkgPT4gUn0gY3JlYXRlX25vZGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gZG9udF91cGRhdGVfbGFzdF9pbmRleFxuICogQHJldHVybnMge1J9XG4gKi9cbmZ1bmN0aW9uIGNsYWltX25vZGUobm9kZXMsIHByZWRpY2F0ZSwgcHJvY2Vzc19ub2RlLCBjcmVhdGVfbm9kZSwgZG9udF91cGRhdGVfbGFzdF9pbmRleCA9IGZhbHNlKSB7XG5cdC8vIFRyeSB0byBmaW5kIG5vZGVzIGluIGFuIG9yZGVyIHN1Y2ggdGhhdCB3ZSBsZW5ndGhlbiB0aGUgbG9uZ2VzdCBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlXG5cdGluaXRfY2xhaW1faW5mbyhub2Rlcyk7XG5cdGNvbnN0IHJlc3VsdF9ub2RlID0gKCgpID0+IHtcblx0XHQvLyBXZSBmaXJzdCB0cnkgdG8gZmluZCBhbiBlbGVtZW50IGFmdGVyIHRoZSBwcmV2aW91cyBvbmVcblx0XHRmb3IgKGxldCBpID0gbm9kZXMuY2xhaW1faW5mby5sYXN0X2luZGV4OyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcblx0XHRcdGlmIChwcmVkaWNhdGUobm9kZSkpIHtcblx0XHRcdFx0Y29uc3QgcmVwbGFjZW1lbnQgPSBwcm9jZXNzX25vZGUobm9kZSk7XG5cdFx0XHRcdGlmIChyZXBsYWNlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0bm9kZXMuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG5vZGVzW2ldID0gcmVwbGFjZW1lbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFkb250X3VwZGF0ZV9sYXN0X2luZGV4KSB7XG5cdFx0XHRcdFx0bm9kZXMuY2xhaW1faW5mby5sYXN0X2luZGV4ID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbm9kZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlLCB3ZSB0cnkgdG8gZmluZCBvbmUgYmVmb3JlXG5cdFx0Ly8gV2UgaXRlcmF0ZSBpbiByZXZlcnNlIHNvIHRoYXQgd2UgZG9uJ3QgZ28gdG9vIGZhciBiYWNrXG5cdFx0Zm9yIChsZXQgaSA9IG5vZGVzLmNsYWltX2luZm8ubGFzdF9pbmRleCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRjb25zdCBub2RlID0gbm9kZXNbaV07XG5cdFx0XHRpZiAocHJlZGljYXRlKG5vZGUpKSB7XG5cdFx0XHRcdGNvbnN0IHJlcGxhY2VtZW50ID0gcHJvY2Vzc19ub2RlKG5vZGUpO1xuXHRcdFx0XHRpZiAocmVwbGFjZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdG5vZGVzLnNwbGljZShpLCAxKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRub2Rlc1tpXSA9IHJlcGxhY2VtZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghZG9udF91cGRhdGVfbGFzdF9pbmRleCkge1xuXHRcdFx0XHRcdG5vZGVzLmNsYWltX2luZm8ubGFzdF9pbmRleCA9IGk7XG5cdFx0XHRcdH0gZWxzZSBpZiAocmVwbGFjZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdC8vIFNpbmNlIHdlIHNwbGljZWQgYmVmb3JlIHRoZSBsYXN0X2luZGV4LCB3ZSBkZWNyZWFzZSBpdFxuXHRcdFx0XHRcdG5vZGVzLmNsYWltX2luZm8ubGFzdF9pbmRleC0tO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBub2RlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBJZiB3ZSBjYW4ndCBmaW5kIGFueSBtYXRjaGluZyBub2RlLCB3ZSBjcmVhdGUgYSBuZXcgb25lXG5cdFx0cmV0dXJuIGNyZWF0ZV9ub2RlKCk7XG5cdH0pKCk7XG5cdHJlc3VsdF9ub2RlLmNsYWltX29yZGVyID0gbm9kZXMuY2xhaW1faW5mby50b3RhbF9jbGFpbWVkO1xuXHRub2Rlcy5jbGFpbV9pbmZvLnRvdGFsX2NsYWltZWQgKz0gMTtcblx0cmV0dXJuIHJlc3VsdF9ub2RlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Q2hpbGROb2RlQXJyYXl9IG5vZGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHt7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfX0gYXR0cmlidXRlc1xuICogQHBhcmFtIHsobmFtZTogc3RyaW5nKSA9PiBFbGVtZW50IHwgU1ZHRWxlbWVudH0gY3JlYXRlX2VsZW1lbnRcbiAqIEByZXR1cm5zIHtFbGVtZW50IHwgU1ZHRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gY2xhaW1fZWxlbWVudF9iYXNlKG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzLCBjcmVhdGVfZWxlbWVudCkge1xuXHRyZXR1cm4gY2xhaW1fbm9kZShcblx0XHRub2Rlcyxcblx0XHQvKiogQHJldHVybnMge25vZGUgaXMgRWxlbWVudCB8IFNWR0VsZW1lbnR9ICovXG5cdFx0KG5vZGUpID0+IG5vZGUubm9kZU5hbWUgPT09IG5hbWUsXG5cdFx0LyoqIEBwYXJhbSB7RWxlbWVudH0gbm9kZSAqL1xuXHRcdChub2RlKSA9PiB7XG5cdFx0XHRjb25zdCByZW1vdmUgPSBbXTtcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGNvbnN0IGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tqXTtcblx0XHRcdFx0aWYgKCFhdHRyaWJ1dGVzW2F0dHJpYnV0ZS5uYW1lXSkge1xuXHRcdFx0XHRcdHJlbW92ZS5wdXNoKGF0dHJpYnV0ZS5uYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmVtb3ZlLmZvckVhY2goKHYpID0+IG5vZGUucmVtb3ZlQXR0cmlidXRlKHYpKTtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fSxcblx0XHQoKSA9PiBjcmVhdGVfZWxlbWVudChuYW1lKVxuXHQpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Q2hpbGROb2RlQXJyYXl9IG5vZGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHt7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfX0gYXR0cmlidXRlc1xuICogQHJldHVybnMge0VsZW1lbnQgfCBTVkdFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1fZWxlbWVudChub2RlcywgbmFtZSwgYXR0cmlidXRlcykge1xuXHRyZXR1cm4gY2xhaW1fZWxlbWVudF9iYXNlKG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzLCBlbGVtZW50KTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0NoaWxkTm9kZUFycmF5fSBub2Rlc1xuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7eyBba2V5OiBzdHJpbmddOiBib29sZWFuIH19IGF0dHJpYnV0ZXNcbiAqIEByZXR1cm5zIHtFbGVtZW50IHwgU1ZHRWxlbWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYWltX3N2Z19lbGVtZW50KG5vZGVzLCBuYW1lLCBhdHRyaWJ1dGVzKSB7XG5cdHJldHVybiBjbGFpbV9lbGVtZW50X2Jhc2Uobm9kZXMsIG5hbWUsIGF0dHJpYnV0ZXMsIHN2Z19lbGVtZW50KTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0NoaWxkTm9kZUFycmF5fSBub2Rlc1xuICogQHJldHVybnMge1RleHR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFpbV90ZXh0KG5vZGVzLCBkYXRhKSB7XG5cdHJldHVybiBjbGFpbV9ub2RlKFxuXHRcdG5vZGVzLFxuXHRcdC8qKiBAcmV0dXJucyB7bm9kZSBpcyBUZXh0fSAqL1xuXHRcdChub2RlKSA9PiBub2RlLm5vZGVUeXBlID09PSAzLFxuXHRcdC8qKiBAcGFyYW0ge1RleHR9IG5vZGUgKi9cblx0XHQobm9kZSkgPT4ge1xuXHRcdFx0Y29uc3QgZGF0YV9zdHIgPSAnJyArIGRhdGE7XG5cdFx0XHRpZiAobm9kZS5kYXRhLnN0YXJ0c1dpdGgoZGF0YV9zdHIpKSB7XG5cdFx0XHRcdGlmIChub2RlLmRhdGEubGVuZ3RoICE9PSBkYXRhX3N0ci5sZW5ndGgpIHtcblx0XHRcdFx0XHRyZXR1cm4gbm9kZS5zcGxpdFRleHQoZGF0YV9zdHIubGVuZ3RoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZS5kYXRhID0gZGF0YV9zdHI7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQoKSA9PiB0ZXh0KGRhdGEpLFxuXHRcdHRydWUgLy8gVGV4dCBub2RlcyBzaG91bGQgbm90IHVwZGF0ZSBsYXN0IGluZGV4IHNpbmNlIGl0IGlzIGxpa2VseSBub3Qgd29ydGggaXQgdG8gZWxpbWluYXRlIGFuIGluY3JlYXNpbmcgc3Vic2VxdWVuY2Ugb2YgYWN0dWFsIGVsZW1lbnRzXG5cdCk7XG59XG5cbi8qKlxuICogQHJldHVybnMge1RleHR9ICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1fc3BhY2Uobm9kZXMpIHtcblx0cmV0dXJuIGNsYWltX3RleHQobm9kZXMsICcgJyk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtDaGlsZE5vZGVBcnJheX0gbm9kZXNcbiAqIEByZXR1cm5zIHtDb21tZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1fY29tbWVudChub2RlcywgZGF0YSkge1xuXHRyZXR1cm4gY2xhaW1fbm9kZShcblx0XHRub2Rlcyxcblx0XHQvKiogQHJldHVybnMge25vZGUgaXMgQ29tbWVudH0gKi9cblx0XHQobm9kZSkgPT4gbm9kZS5ub2RlVHlwZSA9PT0gOCxcblx0XHQvKiogQHBhcmFtIHtDb21tZW50fSBub2RlICovXG5cdFx0KG5vZGUpID0+IHtcblx0XHRcdG5vZGUuZGF0YSA9ICcnICsgZGF0YTtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fSxcblx0XHQoKSA9PiBjb21tZW50KGRhdGEpLFxuXHRcdHRydWVcblx0KTtcbn1cblxuZnVuY3Rpb24gZ2V0X2NvbW1lbnRfaWR4KG5vZGVzLCB0ZXh0LCBzdGFydCkge1xuXHRmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBub2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcblx0XHRpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCAvKiBjb21tZW50IG5vZGUgKi8gJiYgbm9kZS50ZXh0Q29udGVudC50cmltKCkgPT09IHRleHQpIHtcblx0XHRcdHJldHVybiBpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gLTE7XG59XG5cbi8qKlxuICogQHBhcmFtIHtib29sZWFufSBpc19zdmdcbiAqIEByZXR1cm5zIHtIdG1sVGFnSHlkcmF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhaW1faHRtbF90YWcobm9kZXMsIGlzX3N2Zykge1xuXHQvLyBmaW5kIGh0bWwgb3BlbmluZyB0YWdcblx0Y29uc3Qgc3RhcnRfaW5kZXggPSBnZXRfY29tbWVudF9pZHgobm9kZXMsICdIVE1MX1RBR19TVEFSVCcsIDApO1xuXHRjb25zdCBlbmRfaW5kZXggPSBnZXRfY29tbWVudF9pZHgobm9kZXMsICdIVE1MX1RBR19FTkQnLCBzdGFydF9pbmRleCArIDEpO1xuXHRpZiAoc3RhcnRfaW5kZXggPT09IC0xIHx8IGVuZF9pbmRleCA9PT0gLTEpIHtcblx0XHRyZXR1cm4gbmV3IEh0bWxUYWdIeWRyYXRpb24oaXNfc3ZnKTtcblx0fVxuXG5cdGluaXRfY2xhaW1faW5mbyhub2Rlcyk7XG5cdGNvbnN0IGh0bWxfdGFnX25vZGVzID0gbm9kZXMuc3BsaWNlKHN0YXJ0X2luZGV4LCBlbmRfaW5kZXggLSBzdGFydF9pbmRleCArIDEpO1xuXHRkZXRhY2goaHRtbF90YWdfbm9kZXNbMF0pO1xuXHRkZXRhY2goaHRtbF90YWdfbm9kZXNbaHRtbF90YWdfbm9kZXMubGVuZ3RoIC0gMV0pO1xuXHRjb25zdCBjbGFpbWVkX25vZGVzID0gaHRtbF90YWdfbm9kZXMuc2xpY2UoMSwgaHRtbF90YWdfbm9kZXMubGVuZ3RoIC0gMSk7XG5cdGlmIChjbGFpbWVkX25vZGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHJldHVybiBuZXcgSHRtbFRhZ0h5ZHJhdGlvbihpc19zdmcpO1xuXHR9XG5cdGZvciAoY29uc3QgbiBvZiBjbGFpbWVkX25vZGVzKSB7XG5cdFx0bi5jbGFpbV9vcmRlciA9IG5vZGVzLmNsYWltX2luZm8udG90YWxfY2xhaW1lZDtcblx0XHRub2Rlcy5jbGFpbV9pbmZvLnRvdGFsX2NsYWltZWQgKz0gMTtcblx0fVxuXHRyZXR1cm4gbmV3IEh0bWxUYWdIeWRyYXRpb24oaXNfc3ZnLCBjbGFpbWVkX25vZGVzKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1RleHR9IHRleHRcbiAqIEBwYXJhbSB7dW5rbm93bn0gZGF0YVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfZGF0YSh0ZXh0LCBkYXRhKSB7XG5cdGRhdGEgPSAnJyArIGRhdGE7XG5cdGlmICh0ZXh0LmRhdGEgPT09IGRhdGEpIHJldHVybjtcblx0dGV4dC5kYXRhID0gLyoqIEB0eXBlIHtzdHJpbmd9ICovIChkYXRhKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1RleHR9IHRleHRcbiAqIEBwYXJhbSB7dW5rbm93bn0gZGF0YVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfZGF0YV9jb250ZW50ZWRpdGFibGUodGV4dCwgZGF0YSkge1xuXHRkYXRhID0gJycgKyBkYXRhO1xuXHRpZiAodGV4dC53aG9sZVRleHQgPT09IGRhdGEpIHJldHVybjtcblx0dGV4dC5kYXRhID0gLyoqIEB0eXBlIHtzdHJpbmd9ICovIChkYXRhKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1RleHR9IHRleHRcbiAqIEBwYXJhbSB7dW5rbm93bn0gZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IGF0dHJfdmFsdWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2RhdGFfbWF5YmVfY29udGVudGVkaXRhYmxlKHRleHQsIGRhdGEsIGF0dHJfdmFsdWUpIHtcblx0aWYgKH5jb250ZW50ZWRpdGFibGVfdHJ1dGh5X3ZhbHVlcy5pbmRleE9mKGF0dHJfdmFsdWUpKSB7XG5cdFx0c2V0X2RhdGFfY29udGVudGVkaXRhYmxlKHRleHQsIGRhdGEpO1xuXHR9IGVsc2Uge1xuXHRcdHNldF9kYXRhKHRleHQsIGRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2lucHV0X3ZhbHVlKGlucHV0LCB2YWx1ZSkge1xuXHRpbnB1dC52YWx1ZSA9IHZhbHVlID09IG51bGwgPyAnJyA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldF9pbnB1dF90eXBlKGlucHV0LCB0eXBlKSB7XG5cdHRyeSB7XG5cdFx0aW5wdXQudHlwZSA9IHR5cGU7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQvLyBkbyBub3RoaW5nXG5cdH1cbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRfc3R5bGUobm9kZSwga2V5LCB2YWx1ZSwgaW1wb3J0YW50KSB7XG5cdGlmICh2YWx1ZSA9PSBudWxsKSB7XG5cdFx0bm9kZS5zdHlsZS5yZW1vdmVQcm9wZXJ0eShrZXkpO1xuXHR9IGVsc2Uge1xuXHRcdG5vZGUuc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZSwgaW1wb3J0YW50ID8gJ2ltcG9ydGFudCcgOiAnJyk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3Rfb3B0aW9uKHNlbGVjdCwgdmFsdWUsIG1vdW50aW5nKSB7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRjb25zdCBvcHRpb24gPSBzZWxlY3Qub3B0aW9uc1tpXTtcblx0XHRpZiAob3B0aW9uLl9fdmFsdWUgPT09IHZhbHVlKSB7XG5cdFx0XHRvcHRpb24uc2VsZWN0ZWQgPSB0cnVlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXHRpZiAoIW1vdW50aW5nIHx8IHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRzZWxlY3Quc2VsZWN0ZWRJbmRleCA9IC0xOyAvLyBubyBvcHRpb24gc2hvdWxkIGJlIHNlbGVjdGVkXG5cdH1cbn1cblxuLyoqXG4gKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3Rfb3B0aW9ucyhzZWxlY3QsIHZhbHVlKSB7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRjb25zdCBvcHRpb24gPSBzZWxlY3Qub3B0aW9uc1tpXTtcblx0XHRvcHRpb24uc2VsZWN0ZWQgPSB+dmFsdWUuaW5kZXhPZihvcHRpb24uX192YWx1ZSk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdF92YWx1ZShzZWxlY3QpIHtcblx0Y29uc3Qgc2VsZWN0ZWRfb3B0aW9uID0gc2VsZWN0LnF1ZXJ5U2VsZWN0b3IoJzpjaGVja2VkJyk7XG5cdHJldHVybiBzZWxlY3RlZF9vcHRpb24gJiYgc2VsZWN0ZWRfb3B0aW9uLl9fdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3RfbXVsdGlwbGVfdmFsdWUoc2VsZWN0KSB7XG5cdHJldHVybiBbXS5tYXAuY2FsbChzZWxlY3QucXVlcnlTZWxlY3RvckFsbCgnOmNoZWNrZWQnKSwgKG9wdGlvbikgPT4gb3B0aW9uLl9fdmFsdWUpO1xufVxuLy8gdW5mb3J0dW5hdGVseSB0aGlzIGNhbid0IGJlIGEgY29uc3RhbnQgYXMgdGhhdCB3b3VsZG4ndCBiZSB0cmVlLXNoYWtlYWJsZVxuLy8gc28gd2UgY2FjaGUgdGhlIHJlc3VsdCBpbnN0ZWFkXG5cbi8qKlxuICogQHR5cGUge2Jvb2xlYW59ICovXG5sZXQgY3Jvc3NvcmlnaW47XG5cbi8qKlxuICogQHJldHVybnMge2Jvb2xlYW59ICovXG5leHBvcnQgZnVuY3Rpb24gaXNfY3Jvc3NvcmlnaW4oKSB7XG5cdGlmIChjcm9zc29yaWdpbiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0Y3Jvc3NvcmlnaW4gPSBmYWxzZTtcblx0XHR0cnkge1xuXHRcdFx0aWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wYXJlbnQpIHtcblx0XHRcdFx0dm9pZCB3aW5kb3cucGFyZW50LmRvY3VtZW50O1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRjcm9zc29yaWdpbiA9IHRydWU7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBjcm9zc29yaWdpbjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBub2RlXG4gKiBAcGFyYW0geygpID0+IHZvaWR9IGZuXG4gKiBAcmV0dXJucyB7KCkgPT4gdm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZF9pZnJhbWVfcmVzaXplX2xpc3RlbmVyKG5vZGUsIGZuKSB7XG5cdGNvbnN0IGNvbXB1dGVkX3N0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcblx0aWYgKGNvbXB1dGVkX3N0eWxlLnBvc2l0aW9uID09PSAnc3RhdGljJykge1xuXHRcdG5vZGUuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuXHR9XG5cdGNvbnN0IGlmcmFtZSA9IGVsZW1lbnQoJ2lmcmFtZScpO1xuXHRpZnJhbWUuc2V0QXR0cmlidXRlKFxuXHRcdCdzdHlsZScsXG5cdFx0J2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTsgJyArXG5cdFx0XHQnb3ZlcmZsb3c6IGhpZGRlbjsgYm9yZGVyOiAwOyBvcGFjaXR5OiAwOyBwb2ludGVyLWV2ZW50czogbm9uZTsgei1pbmRleDogLTE7J1xuXHQpO1xuXHRpZnJhbWUuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cdGlmcmFtZS50YWJJbmRleCA9IC0xO1xuXHRjb25zdCBjcm9zc29yaWdpbiA9IGlzX2Nyb3Nzb3JpZ2luKCk7XG5cblx0LyoqXG5cdCAqIEB0eXBlIHsoKSA9PiB2b2lkfVxuXHQgKi9cblx0bGV0IHVuc3Vic2NyaWJlO1xuXHRpZiAoY3Jvc3NvcmlnaW4pIHtcblx0XHRpZnJhbWUuc3JjID0gXCJkYXRhOnRleHQvaHRtbCw8c2NyaXB0Pm9ucmVzaXplPWZ1bmN0aW9uKCl7cGFyZW50LnBvc3RNZXNzYWdlKDAsJyonKX08L3NjcmlwdD5cIjtcblx0XHR1bnN1YnNjcmliZSA9IGxpc3Rlbihcblx0XHRcdHdpbmRvdyxcblx0XHRcdCdtZXNzYWdlJyxcblx0XHRcdC8qKiBAcGFyYW0ge01lc3NhZ2VFdmVudH0gZXZlbnQgKi8gKGV2ZW50KSA9PiB7XG5cdFx0XHRcdGlmIChldmVudC5zb3VyY2UgPT09IGlmcmFtZS5jb250ZW50V2luZG93KSBmbigpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0gZWxzZSB7XG5cdFx0aWZyYW1lLnNyYyA9ICdhYm91dDpibGFuayc7XG5cdFx0aWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcblx0XHRcdHVuc3Vic2NyaWJlID0gbGlzdGVuKGlmcmFtZS5jb250ZW50V2luZG93LCAncmVzaXplJywgZm4pO1xuXHRcdFx0Ly8gbWFrZSBzdXJlIGFuIGluaXRpYWwgcmVzaXplIGV2ZW50IGlzIGZpcmVkIF9hZnRlcl8gdGhlIGlmcmFtZSBpcyBsb2FkZWQgKHdoaWNoIGlzIGFzeW5jaHJvbm91cylcblx0XHRcdC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vc3ZlbHRlanMvc3ZlbHRlL2lzc3Vlcy80MjMzXG5cdFx0XHRmbigpO1xuXHRcdH07XG5cdH1cblx0YXBwZW5kKG5vZGUsIGlmcmFtZSk7XG5cdHJldHVybiAoKSA9PiB7XG5cdFx0aWYgKGNyb3Nzb3JpZ2luKSB7XG5cdFx0XHR1bnN1YnNjcmliZSgpO1xuXHRcdH0gZWxzZSBpZiAodW5zdWJzY3JpYmUgJiYgaWZyYW1lLmNvbnRlbnRXaW5kb3cpIHtcblx0XHRcdHVuc3Vic2NyaWJlKCk7XG5cdFx0fVxuXHRcdGRldGFjaChpZnJhbWUpO1xuXHR9O1xufVxuZXhwb3J0IGNvbnN0IHJlc2l6ZV9vYnNlcnZlcl9jb250ZW50X2JveCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgUmVzaXplT2JzZXJ2ZXJTaW5nbGV0b24oe1xuXHRib3g6ICdjb250ZW50LWJveCdcbn0pO1xuZXhwb3J0IGNvbnN0IHJlc2l6ZV9vYnNlcnZlcl9ib3JkZXJfYm94ID0gLyogQF9fUFVSRV9fICovIG5ldyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbih7XG5cdGJveDogJ2JvcmRlci1ib3gnXG59KTtcbmV4cG9ydCBjb25zdCByZXNpemVfb2JzZXJ2ZXJfZGV2aWNlX3BpeGVsX2NvbnRlbnRfYm94ID0gLyogQF9fUFVSRV9fICovIG5ldyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbihcblx0eyBib3g6ICdkZXZpY2UtcGl4ZWwtY29udGVudC1ib3gnIH1cbik7XG5leHBvcnQgeyBSZXNpemVPYnNlcnZlclNpbmdsZXRvbiB9O1xuXG4vKipcbiAqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvZ2dsZV9jbGFzcyhlbGVtZW50LCBuYW1lLCB0b2dnbGUpIHtcblx0Ly8gVGhlIGAhIWAgaXMgcmVxdWlyZWQgYmVjYXVzZSBhbiBgdW5kZWZpbmVkYCBmbGFnIG1lYW5zIGZsaXBwaW5nIHRoZSBjdXJyZW50IHN0YXRlLlxuXHRlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUobmFtZSwgISF0b2dnbGUpO1xufVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtUfSBbZGV0YWlsXVxuICogQHBhcmFtIHt7IGJ1YmJsZXM/OiBib29sZWFuLCBjYW5jZWxhYmxlPzogYm9vbGVhbiB9fSBbb3B0aW9uc11cbiAqIEByZXR1cm5zIHtDdXN0b21FdmVudDxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwsIHsgYnViYmxlcyA9IGZhbHNlLCBjYW5jZWxhYmxlID0gZmFsc2UgfSA9IHt9KSB7XG5cdHJldHVybiBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWwsIGJ1YmJsZXMsIGNhbmNlbGFibGUgfSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwYXJlbnRcbiAqIEByZXR1cm5zIHtDaGlsZE5vZGVBcnJheX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJ5X3NlbGVjdG9yX2FsbChzZWxlY3RvciwgcGFyZW50ID0gZG9jdW1lbnQuYm9keSkge1xuXHRyZXR1cm4gQXJyYXkuZnJvbShwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBub2RlSWRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGhlYWRcbiAqIEByZXR1cm5zIHthbnlbXX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhlYWRfc2VsZWN0b3Iobm9kZUlkLCBoZWFkKSB7XG5cdGNvbnN0IHJlc3VsdCA9IFtdO1xuXHRsZXQgc3RhcnRlZCA9IDA7XG5cdGZvciAoY29uc3Qgbm9kZSBvZiBoZWFkLmNoaWxkTm9kZXMpIHtcblx0XHRpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCAvKiBjb21tZW50IG5vZGUgKi8pIHtcblx0XHRcdGNvbnN0IGNvbW1lbnQgPSBub2RlLnRleHRDb250ZW50LnRyaW0oKTtcblx0XHRcdGlmIChjb21tZW50ID09PSBgSEVBRF8ke25vZGVJZH1fRU5EYCkge1xuXHRcdFx0XHRzdGFydGVkIC09IDE7XG5cdFx0XHRcdHJlc3VsdC5wdXNoKG5vZGUpO1xuXHRcdFx0fSBlbHNlIGlmIChjb21tZW50ID09PSBgSEVBRF8ke25vZGVJZH1fU1RBUlRgKSB7XG5cdFx0XHRcdHN0YXJ0ZWQgKz0gMTtcblx0XHRcdFx0cmVzdWx0LnB1c2gobm9kZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChzdGFydGVkID4gMCkge1xuXHRcdFx0cmVzdWx0LnB1c2gobm9kZSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG4vKiogKi9cbmV4cG9ydCBjbGFzcyBIdG1sVGFnIHtcblx0LyoqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBkZWZhdWx0IGZhbHNlXG5cdCAqL1xuXHRpc19zdmcgPSBmYWxzZTtcblx0LyoqIHBhcmVudCBmb3IgY3JlYXRpbmcgbm9kZSAqL1xuXHRlID0gdW5kZWZpbmVkO1xuXHQvKiogaHRtbCB0YWcgbm9kZXMgKi9cblx0biA9IHVuZGVmaW5lZDtcblx0LyoqIHRhcmdldCAqL1xuXHR0ID0gdW5kZWZpbmVkO1xuXHQvKiogYW5jaG9yICovXG5cdGEgPSB1bmRlZmluZWQ7XG5cdGNvbnN0cnVjdG9yKGlzX3N2ZyA9IGZhbHNlKSB7XG5cdFx0dGhpcy5pc19zdmcgPSBpc19zdmc7XG5cdFx0dGhpcy5lID0gdGhpcy5uID0gbnVsbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gaHRtbFxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGMoaHRtbCkge1xuXHRcdHRoaXMuaChodG1sKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gaHRtbFxuXHQgKiBAcGFyYW0ge0hUTUxFbGVtZW50IHwgU1ZHRWxlbWVudH0gdGFyZ2V0XG5cdCAqIEBwYXJhbSB7SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50fSBhbmNob3Jcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRtKGh0bWwsIHRhcmdldCwgYW5jaG9yID0gbnVsbCkge1xuXHRcdGlmICghdGhpcy5lKSB7XG5cdFx0XHRpZiAodGhpcy5pc19zdmcpXG5cdFx0XHRcdHRoaXMuZSA9IHN2Z19lbGVtZW50KC8qKiBAdHlwZSB7a2V5b2YgU1ZHRWxlbWVudFRhZ05hbWVNYXB9ICovICh0YXJnZXQubm9kZU5hbWUpKTtcblx0XHRcdC8qKiAjNzM2NCAgdGFyZ2V0IGZvciA8dGVtcGxhdGU+IG1heSBiZSBwcm92aWRlZCBhcyAjZG9jdW1lbnQtZnJhZ21lbnQoMTEpICovIGVsc2Vcblx0XHRcdFx0dGhpcy5lID0gZWxlbWVudChcblx0XHRcdFx0XHQvKiogQHR5cGUge2tleW9mIEhUTUxFbGVtZW50VGFnTmFtZU1hcH0gKi8gKFxuXHRcdFx0XHRcdFx0dGFyZ2V0Lm5vZGVUeXBlID09PSAxMSA/ICdURU1QTEFURScgOiB0YXJnZXQubm9kZU5hbWVcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCk7XG5cdFx0XHR0aGlzLnQgPVxuXHRcdFx0XHR0YXJnZXQudGFnTmFtZSAhPT0gJ1RFTVBMQVRFJ1xuXHRcdFx0XHRcdD8gdGFyZ2V0XG5cdFx0XHRcdFx0OiAvKiogQHR5cGUge0hUTUxUZW1wbGF0ZUVsZW1lbnR9ICovICh0YXJnZXQpLmNvbnRlbnQ7XG5cdFx0XHR0aGlzLmMoaHRtbCk7XG5cdFx0fVxuXHRcdHRoaXMuaShhbmNob3IpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBodG1sXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0aChodG1sKSB7XG5cdFx0dGhpcy5lLmlubmVySFRNTCA9IGh0bWw7XG5cdFx0dGhpcy5uID0gQXJyYXkuZnJvbShcblx0XHRcdHRoaXMuZS5ub2RlTmFtZSA9PT0gJ1RFTVBMQVRFJyA/IHRoaXMuZS5jb250ZW50LmNoaWxkTm9kZXMgOiB0aGlzLmUuY2hpbGROb2Rlc1xuXHRcdCk7XG5cdH1cblxuXHQvKipcblx0ICogQHJldHVybnMge3ZvaWR9ICovXG5cdGkoYW5jaG9yKSB7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm4ubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGluc2VydCh0aGlzLnQsIHRoaXMubltpXSwgYW5jaG9yKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtzdHJpbmd9IGh0bWxcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRwKGh0bWwpIHtcblx0XHR0aGlzLmQoKTtcblx0XHR0aGlzLmgoaHRtbCk7XG5cdFx0dGhpcy5pKHRoaXMuYSk7XG5cdH1cblxuXHQvKipcblx0ICogQHJldHVybnMge3ZvaWR9ICovXG5cdGQoKSB7XG5cdFx0dGhpcy5uLmZvckVhY2goZGV0YWNoKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgSHRtbFRhZ0h5ZHJhdGlvbiBleHRlbmRzIEh0bWxUYWcge1xuXHQvKiogQHR5cGUge0VsZW1lbnRbXX0gaHlkcmF0aW9uIGNsYWltZWQgbm9kZXMgKi9cblx0bCA9IHVuZGVmaW5lZDtcblxuXHRjb25zdHJ1Y3Rvcihpc19zdmcgPSBmYWxzZSwgY2xhaW1lZF9ub2Rlcykge1xuXHRcdHN1cGVyKGlzX3N2Zyk7XG5cdFx0dGhpcy5lID0gdGhpcy5uID0gbnVsbDtcblx0XHR0aGlzLmwgPSBjbGFpbWVkX25vZGVzO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBodG1sXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0YyhodG1sKSB7XG5cdFx0aWYgKHRoaXMubCkge1xuXHRcdFx0dGhpcy5uID0gdGhpcy5sO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdXBlci5jKGh0bWwpO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcmV0dXJucyB7dm9pZH0gKi9cblx0aShhbmNob3IpIHtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubi5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0aW5zZXJ0X2h5ZHJhdGlvbih0aGlzLnQsIHRoaXMubltpXSwgYW5jaG9yKTtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge05hbWVkTm9kZU1hcH0gYXR0cmlidXRlc1xuICogQHJldHVybnMge3t9fVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXR0cmlidXRlX3RvX29iamVjdChhdHRyaWJ1dGVzKSB7XG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xuXHRmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiBhdHRyaWJ1dGVzKSB7XG5cdFx0cmVzdWx0W2F0dHJpYnV0ZS5uYW1lXSA9IGF0dHJpYnV0ZS52YWx1ZTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCBlc2NhcGVkID0ge1xuXHQnXCInOiAnJnF1b3Q7Jyxcblx0JyYnOiAnJmFtcDsnLFxuXHQnPCc6ICcmbHQ7J1xufTtcblxuY29uc3QgcmVnZXhfYXR0cmlidXRlX2NoYXJhY3RlcnNfdG9fZXNjYXBlID0gL1tcIiY8XS9nO1xuXG4vKipcbiAqIE5vdGUgdGhhdCB0aGUgYXR0cmlidXRlIGl0c2VsZiBzaG91bGQgYmUgc3Vycm91bmRlZCBpbiBkb3VibGUgcXVvdGVzXG4gKiBAcGFyYW0ge2FueX0gYXR0cmlidXRlXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZV9hdHRyaWJ1dGUoYXR0cmlidXRlKSB7XG5cdHJldHVybiBTdHJpbmcoYXR0cmlidXRlKS5yZXBsYWNlKHJlZ2V4X2F0dHJpYnV0ZV9jaGFyYWN0ZXJzX3RvX2VzY2FwZSwgKG1hdGNoKSA9PiBlc2NhcGVkW21hdGNoXSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+fSBhdHRyaWJ1dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlfc3ByZWFkKGF0dHJpYnV0ZXMpIHtcblx0bGV0IHN0ciA9ICcgJztcblx0Zm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuXHRcdGlmIChhdHRyaWJ1dGVzW2tleV0gIT0gbnVsbCkge1xuXHRcdFx0c3RyICs9IGAke2tleX09XCIke2VzY2FwZV9hdHRyaWJ1dGUoYXR0cmlidXRlc1trZXldKX1cIiBgO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdHI7XG59XG5cbi8qKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge3t9fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X2N1c3RvbV9lbGVtZW50c19zbG90cyhlbGVtZW50KSB7XG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xuXHRlbGVtZW50LmNoaWxkTm9kZXMuZm9yRWFjaChcblx0XHQvKiogQHBhcmFtIHtFbGVtZW50fSBub2RlICovIChub2RlKSA9PiB7XG5cdFx0XHRyZXN1bHRbbm9kZS5zbG90IHx8ICdkZWZhdWx0J10gPSB0cnVlO1xuXHRcdH1cblx0KTtcblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnN0cnVjdF9zdmVsdGVfY29tcG9uZW50KGNvbXBvbmVudCwgcHJvcHMpIHtcblx0cmV0dXJuIG5ldyBjb21wb25lbnQocHJvcHMpO1xufVxuXG4vKipcbiAqIEB0eXBlZGVmIHtOb2RlICYge1xuICogXHRjbGFpbV9vcmRlcj86IG51bWJlcjtcbiAqIFx0aHlkcmF0ZV9pbml0PzogdHJ1ZTtcbiAqIFx0YWN0dWFsX2VuZF9jaGlsZD86IE5vZGVFeDtcbiAqIFx0Y2hpbGROb2RlczogTm9kZUxpc3RPZjxOb2RlRXg+O1xuICogfX0gTm9kZUV4XG4gKi9cblxuLyoqIEB0eXBlZGVmIHtDaGlsZE5vZGUgJiBOb2RlRXh9IENoaWxkTm9kZUV4ICovXG5cbi8qKiBAdHlwZWRlZiB7Tm9kZUV4ICYgeyBjbGFpbV9vcmRlcjogbnVtYmVyIH19IE5vZGVFeDIgKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7Q2hpbGROb2RlRXhbXSAmIHtcbiAqIFx0Y2xhaW1faW5mbz86IHtcbiAqIFx0XHRsYXN0X2luZGV4OiBudW1iZXI7XG4gKiBcdFx0dG90YWxfY2xhaW1lZDogbnVtYmVyO1xuICogXHR9O1xuICogfX0gQ2hpbGROb2RlQXJyYXlcbiAqL1xuIiwiaW1wb3J0IHsgY3VzdG9tX2V2ZW50IH0gZnJvbSAnLi9kb20uanMnO1xuXG5leHBvcnQgbGV0IGN1cnJlbnRfY29tcG9uZW50O1xuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gc2V0X2N1cnJlbnRfY29tcG9uZW50KGNvbXBvbmVudCkge1xuXHRjdXJyZW50X2NvbXBvbmVudCA9IGNvbXBvbmVudDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF9jdXJyZW50X2NvbXBvbmVudCgpIHtcblx0aWYgKCFjdXJyZW50X2NvbXBvbmVudCkgdGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbiBjYWxsZWQgb3V0c2lkZSBjb21wb25lbnQgaW5pdGlhbGl6YXRpb24nKTtcblx0cmV0dXJuIGN1cnJlbnRfY29tcG9uZW50O1xufVxuXG4vKipcbiAqIFNjaGVkdWxlcyBhIGNhbGxiYWNrIHRvIHJ1biBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyB1cGRhdGVkIGFmdGVyIGFueSBzdGF0ZSBjaGFuZ2UuXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIHJ1bnMgd2lsbCBiZSBiZWZvcmUgdGhlIGluaXRpYWwgYG9uTW91bnRgXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2JlZm9yZXVwZGF0ZVxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuXHRnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5iZWZvcmVfdXBkYXRlLnB1c2goZm4pO1xufVxuXG4vKipcbiAqIFRoZSBgb25Nb3VudGAgZnVuY3Rpb24gc2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGFzIHNvb24gYXMgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiBtb3VudGVkIHRvIHRoZSBET00uXG4gKiBJdCBtdXN0IGJlIGNhbGxlZCBkdXJpbmcgdGhlIGNvbXBvbmVudCdzIGluaXRpYWxpc2F0aW9uIChidXQgZG9lc24ndCBuZWVkIHRvIGxpdmUgKmluc2lkZSogdGhlIGNvbXBvbmVudDtcbiAqIGl0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbiBleHRlcm5hbCBtb2R1bGUpLlxuICpcbiAqIElmIGEgZnVuY3Rpb24gaXMgcmV0dXJuZWQgX3N5bmNocm9ub3VzbHlfIGZyb20gYG9uTW91bnRgLCBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIGBvbk1vdW50YCBkb2VzIG5vdCBydW4gaW5zaWRlIGEgW3NlcnZlci1zaWRlIGNvbXBvbmVudF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3MjcnVuLXRpbWUtc2VydmVyLXNpZGUtY29tcG9uZW50LWFwaSkuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI29ubW91bnRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0geygpID0+IGltcG9ydCgnLi9wcml2YXRlLmpzJykuTm90RnVuY3Rpb248VD4gfCBQcm9taXNlPGltcG9ydCgnLi9wcml2YXRlLmpzJykuTm90RnVuY3Rpb248VD4+IHwgKCgpID0+IGFueSl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcblx0Z2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQub25fbW91bnQucHVzaChmbik7XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdXBkYXRlZC5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGFmdGVyIHRoZSBpbml0aWFsIGBvbk1vdW50YFxuICpcbiAqIGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZSNhZnRlcnVwZGF0ZVxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFmdGVyVXBkYXRlKGZuKSB7XG5cdGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmFmdGVyX3VwZGF0ZS5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBTY2hlZHVsZXMgYSBjYWxsYmFjayB0byBydW4gaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIE91dCBvZiBgb25Nb3VudGAsIGBiZWZvcmVVcGRhdGVgLCBgYWZ0ZXJVcGRhdGVgIGFuZCBgb25EZXN0cm95YCwgdGhpcyBpcyB0aGVcbiAqIG9ubHkgb25lIHRoYXQgcnVucyBpbnNpZGUgYSBzZXJ2ZXItc2lkZSBjb21wb25lbnQuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI29uZGVzdHJveVxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uRGVzdHJveShmbikge1xuXHRnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5vbl9kZXN0cm95LnB1c2goZm4pO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gZXZlbnQgZGlzcGF0Y2hlciB0aGF0IGNhbiBiZSB1c2VkIHRvIGRpc3BhdGNoIFtjb21wb25lbnQgZXZlbnRzXShodHRwczovL3N2ZWx0ZS5kZXYvZG9jcyN0ZW1wbGF0ZS1zeW50YXgtY29tcG9uZW50LWRpcmVjdGl2ZXMtb24tZXZlbnRuYW1lKS5cbiAqIEV2ZW50IGRpc3BhdGNoZXJzIGFyZSBmdW5jdGlvbnMgdGhhdCBjYW4gdGFrZSB0d28gYXJndW1lbnRzOiBgbmFtZWAgYW5kIGBkZXRhaWxgLlxuICpcbiAqIENvbXBvbmVudCBldmVudHMgY3JlYXRlZCB3aXRoIGBjcmVhdGVFdmVudERpc3BhdGNoZXJgIGNyZWF0ZSBhXG4gKiBbQ3VzdG9tRXZlbnRdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudCkuXG4gKiBUaGVzZSBldmVudHMgZG8gbm90IFtidWJibGVdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvTGVhcm4vSmF2YVNjcmlwdC9CdWlsZGluZ19ibG9ja3MvRXZlbnRzI0V2ZW50X2J1YmJsaW5nX2FuZF9jYXB0dXJlKS5cbiAqIFRoZSBgZGV0YWlsYCBhcmd1bWVudCBjb3JyZXNwb25kcyB0byB0aGUgW0N1c3RvbUV2ZW50LmRldGFpbF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0N1c3RvbUV2ZW50L2RldGFpbClcbiAqIHByb3BlcnR5IGFuZCBjYW4gY29udGFpbiBhbnkgdHlwZSBvZiBkYXRhLlxuICpcbiAqIFRoZSBldmVudCBkaXNwYXRjaGVyIGNhbiBiZSB0eXBlZCB0byBuYXJyb3cgdGhlIGFsbG93ZWQgZXZlbnQgbmFtZXMgYW5kIHRoZSB0eXBlIG9mIHRoZSBgZGV0YWlsYCBhcmd1bWVudDpcbiAqIGBgYHRzXG4gKiBjb25zdCBkaXNwYXRjaCA9IGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcjx7XG4gKiAgbG9hZGVkOiBuZXZlcjsgLy8gZG9lcyBub3QgdGFrZSBhIGRldGFpbCBhcmd1bWVudFxuICogIGNoYW5nZTogc3RyaW5nOyAvLyB0YWtlcyBhIGRldGFpbCBhcmd1bWVudCBvZiB0eXBlIHN0cmluZywgd2hpY2ggaXMgcmVxdWlyZWRcbiAqICBvcHRpb25hbDogbnVtYmVyIHwgbnVsbDsgLy8gdGFrZXMgYW4gb3B0aW9uYWwgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgbnVtYmVyXG4gKiB9PigpO1xuICogYGBgXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2NyZWF0ZWV2ZW50ZGlzcGF0Y2hlclxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRNYXA9YW55XVxuICogQHJldHVybnMge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5FdmVudERpc3BhdGNoZXI8RXZlbnRNYXA+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCkge1xuXHRjb25zdCBjb21wb25lbnQgPSBnZXRfY3VycmVudF9jb21wb25lbnQoKTtcblx0cmV0dXJuICh0eXBlLCBkZXRhaWwsIHsgY2FuY2VsYWJsZSA9IGZhbHNlIH0gPSB7fSkgPT4ge1xuXHRcdGNvbnN0IGNhbGxiYWNrcyA9IGNvbXBvbmVudC4kJC5jYWxsYmFja3NbdHlwZV07XG5cdFx0aWYgKGNhbGxiYWNrcykge1xuXHRcdFx0Ly8gVE9ETyBhcmUgdGhlcmUgc2l0dWF0aW9ucyB3aGVyZSBldmVudHMgY291bGQgYmUgZGlzcGF0Y2hlZFxuXHRcdFx0Ly8gaW4gYSBzZXJ2ZXIgKG5vbi1ET00pIGVudmlyb25tZW50P1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBjdXN0b21fZXZlbnQoLyoqIEB0eXBlIHtzdHJpbmd9ICovICh0eXBlKSwgZGV0YWlsLCB7IGNhbmNlbGFibGUgfSk7XG5cdFx0XHRjYWxsYmFja3Muc2xpY2UoKS5mb3JFYWNoKChmbikgPT4ge1xuXHRcdFx0XHRmbi5jYWxsKGNvbXBvbmVudCwgZXZlbnQpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gIWV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQ7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xufVxuXG4vKipcbiAqIEFzc29jaWF0ZXMgYW4gYXJiaXRyYXJ5IGBjb250ZXh0YCBvYmplY3Qgd2l0aCB0aGUgY3VycmVudCBjb21wb25lbnQgYW5kIHRoZSBzcGVjaWZpZWQgYGtleWBcbiAqIGFuZCByZXR1cm5zIHRoYXQgb2JqZWN0LiBUaGUgY29udGV4dCBpcyB0aGVuIGF2YWlsYWJsZSB0byBjaGlsZHJlbiBvZiB0aGUgY29tcG9uZW50XG4gKiAoaW5jbHVkaW5nIHNsb3R0ZWQgY29udGVudCkgd2l0aCBgZ2V0Q29udGV4dGAuXG4gKlxuICogTGlrZSBsaWZlY3ljbGUgZnVuY3Rpb25zLCB0aGlzIG11c3QgYmUgY2FsbGVkIGR1cmluZyBjb21wb25lbnQgaW5pdGlhbGlzYXRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI3NldGNvbnRleHRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge2FueX0ga2V5XG4gKiBAcGFyYW0ge1R9IGNvbnRleHRcbiAqIEByZXR1cm5zIHtUfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q29udGV4dChrZXksIGNvbnRleHQpIHtcblx0Z2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuY29udGV4dC5zZXQoa2V5LCBjb250ZXh0KTtcblx0cmV0dXJuIGNvbnRleHQ7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBjb250ZXh0IHRoYXQgYmVsb25ncyB0byB0aGUgY2xvc2VzdCBwYXJlbnQgY29tcG9uZW50IHdpdGggdGhlIHNwZWNpZmllZCBga2V5YC5cbiAqIE11c3QgYmUgY2FsbGVkIGR1cmluZyBjb21wb25lbnQgaW5pdGlhbGlzYXRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2dldGNvbnRleHRcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge2FueX0ga2V5XG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRleHQoa2V5KSB7XG5cdHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmdldChrZXkpO1xufVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgd2hvbGUgY29udGV4dCBtYXAgdGhhdCBiZWxvbmdzIHRvIHRoZSBjbG9zZXN0IHBhcmVudCBjb21wb25lbnQuXG4gKiBNdXN0IGJlIGNhbGxlZCBkdXJpbmcgY29tcG9uZW50IGluaXRpYWxpc2F0aW9uLiBVc2VmdWwsIGZvciBleGFtcGxlLCBpZiB5b3VcbiAqIHByb2dyYW1tYXRpY2FsbHkgY3JlYXRlIGEgY29tcG9uZW50IGFuZCB3YW50IHRvIHBhc3MgdGhlIGV4aXN0aW5nIGNvbnRleHQgdG8gaXQuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlI2dldGFsbGNvbnRleHRzXG4gKiBAdGVtcGxhdGUge01hcDxhbnksIGFueT59IFtUPU1hcDxhbnksIGFueT5dXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbENvbnRleHRzKCkge1xuXHRyZXR1cm4gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuY29udGV4dDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIGBrZXlgIGhhcyBiZWVuIHNldCBpbiB0aGUgY29udGV4dCBvZiBhIHBhcmVudCBjb21wb25lbnQuXG4gKiBNdXN0IGJlIGNhbGxlZCBkdXJpbmcgY29tcG9uZW50IGluaXRpYWxpc2F0aW9uLlxuICpcbiAqIGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZSNoYXNjb250ZXh0XG4gKiBAcGFyYW0ge2FueX0ga2V5XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0NvbnRleHQoa2V5KSB7XG5cdHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmhhcyhrZXkpO1xufVxuXG4vLyBUT0RPIGZpZ3VyZSBvdXQgaWYgd2Ugc3RpbGwgd2FudCB0byBzdXBwb3J0XG4vLyBzaG9ydGhhbmQgZXZlbnRzLCBvciBpZiB3ZSB3YW50IHRvIGltcGxlbWVudFxuLy8gYSByZWFsIGJ1YmJsaW5nIG1lY2hhbmlzbVxuLyoqXG4gKiBAcGFyYW0gY29tcG9uZW50XG4gKiBAcGFyYW0gZXZlbnRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYnViYmxlKGNvbXBvbmVudCwgZXZlbnQpIHtcblx0Y29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1tldmVudC50eXBlXTtcblx0aWYgKGNhbGxiYWNrcykge1xuXHRcdC8vIEB0cy1pZ25vcmVcblx0XHRjYWxsYmFja3Muc2xpY2UoKS5mb3JFYWNoKChmbikgPT4gZm4uY2FsbCh0aGlzLCBldmVudCkpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBydW5fYWxsIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgeyBjdXJyZW50X2NvbXBvbmVudCwgc2V0X2N1cnJlbnRfY29tcG9uZW50IH0gZnJvbSAnLi9saWZlY3ljbGUuanMnO1xuXG5leHBvcnQgY29uc3QgZGlydHlfY29tcG9uZW50cyA9IFtdO1xuZXhwb3J0IGNvbnN0IGludHJvcyA9IHsgZW5hYmxlZDogZmFsc2UgfTtcbmV4cG9ydCBjb25zdCBiaW5kaW5nX2NhbGxiYWNrcyA9IFtdO1xuXG5sZXQgcmVuZGVyX2NhbGxiYWNrcyA9IFtdO1xuXG5jb25zdCBmbHVzaF9jYWxsYmFja3MgPSBbXTtcblxuY29uc3QgcmVzb2x2ZWRfcHJvbWlzZSA9IC8qIEBfX1BVUkVfXyAqLyBQcm9taXNlLnJlc29sdmUoKTtcblxubGV0IHVwZGF0ZV9zY2hlZHVsZWQgPSBmYWxzZTtcblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjaGVkdWxlX3VwZGF0ZSgpIHtcblx0aWYgKCF1cGRhdGVfc2NoZWR1bGVkKSB7XG5cdFx0dXBkYXRlX3NjaGVkdWxlZCA9IHRydWU7XG5cdFx0cmVzb2x2ZWRfcHJvbWlzZS50aGVuKGZsdXNoKTtcblx0fVxufVxuXG4vKiogQHJldHVybnMge1Byb21pc2U8dm9pZD59ICovXG5leHBvcnQgZnVuY3Rpb24gdGljaygpIHtcblx0c2NoZWR1bGVfdXBkYXRlKCk7XG5cdHJldHVybiByZXNvbHZlZF9wcm9taXNlO1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gYWRkX3JlbmRlcl9jYWxsYmFjayhmbikge1xuXHRyZW5kZXJfY2FsbGJhY2tzLnB1c2goZm4pO1xufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gYWRkX2ZsdXNoX2NhbGxiYWNrKGZuKSB7XG5cdGZsdXNoX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cblxuLy8gZmx1c2goKSBjYWxscyBjYWxsYmFja3MgaW4gdGhpcyBvcmRlcjpcbi8vIDEuIEFsbCBiZWZvcmVVcGRhdGUgY2FsbGJhY2tzLCBpbiBvcmRlcjogcGFyZW50cyBiZWZvcmUgY2hpbGRyZW5cbi8vIDIuIEFsbCBiaW5kOnRoaXMgY2FsbGJhY2tzLCBpbiByZXZlcnNlIG9yZGVyOiBjaGlsZHJlbiBiZWZvcmUgcGFyZW50cy5cbi8vIDMuIEFsbCBhZnRlclVwZGF0ZSBjYWxsYmFja3MsIGluIG9yZGVyOiBwYXJlbnRzIGJlZm9yZSBjaGlsZHJlbi4gRVhDRVBUXG4vLyAgICBmb3IgYWZ0ZXJVcGRhdGVzIGNhbGxlZCBkdXJpbmcgdGhlIGluaXRpYWwgb25Nb3VudCwgd2hpY2ggYXJlIGNhbGxlZCBpblxuLy8gICAgcmV2ZXJzZSBvcmRlcjogY2hpbGRyZW4gYmVmb3JlIHBhcmVudHMuXG4vLyBTaW5jZSBjYWxsYmFja3MgbWlnaHQgdXBkYXRlIGNvbXBvbmVudCB2YWx1ZXMsIHdoaWNoIGNvdWxkIHRyaWdnZXIgYW5vdGhlclxuLy8gY2FsbCB0byBmbHVzaCgpLCB0aGUgZm9sbG93aW5nIHN0ZXBzIGd1YXJkIGFnYWluc3QgdGhpczpcbi8vIDEuIER1cmluZyBiZWZvcmVVcGRhdGUsIGFueSB1cGRhdGVkIGNvbXBvbmVudHMgd2lsbCBiZSBhZGRlZCB0byB0aGVcbi8vICAgIGRpcnR5X2NvbXBvbmVudHMgYXJyYXkgYW5kIHdpbGwgY2F1c2UgYSByZWVudHJhbnQgY2FsbCB0byBmbHVzaCgpLiBCZWNhdXNlXG4vLyAgICB0aGUgZmx1c2ggaW5kZXggaXMga2VwdCBvdXRzaWRlIHRoZSBmdW5jdGlvbiwgdGhlIHJlZW50cmFudCBjYWxsIHdpbGwgcGlja1xuLy8gICAgdXAgd2hlcmUgdGhlIGVhcmxpZXIgY2FsbCBsZWZ0IG9mZiBhbmQgZ28gdGhyb3VnaCBhbGwgZGlydHkgY29tcG9uZW50cy4gVGhlXG4vLyAgICBjdXJyZW50X2NvbXBvbmVudCB2YWx1ZSBpcyBzYXZlZCBhbmQgcmVzdG9yZWQgc28gdGhhdCB0aGUgcmVlbnRyYW50IGNhbGwgd2lsbFxuLy8gICAgbm90IGludGVyZmVyZSB3aXRoIHRoZSBcInBhcmVudFwiIGZsdXNoKCkgY2FsbC5cbi8vIDIuIGJpbmQ6dGhpcyBjYWxsYmFja3MgY2Fubm90IHRyaWdnZXIgbmV3IGZsdXNoKCkgY2FsbHMuXG4vLyAzLiBEdXJpbmcgYWZ0ZXJVcGRhdGUsIGFueSB1cGRhdGVkIGNvbXBvbmVudHMgd2lsbCBOT1QgaGF2ZSB0aGVpciBhZnRlclVwZGF0ZVxuLy8gICAgY2FsbGJhY2sgY2FsbGVkIGEgc2Vjb25kIHRpbWU7IHRoZSBzZWVuX2NhbGxiYWNrcyBzZXQsIG91dHNpZGUgdGhlIGZsdXNoKClcbi8vICAgIGZ1bmN0aW9uLCBndWFyYW50ZWVzIHRoaXMgYmVoYXZpb3IuXG5jb25zdCBzZWVuX2NhbGxiYWNrcyA9IG5ldyBTZXQoKTtcblxubGV0IGZsdXNoaWR4ID0gMDsgLy8gRG8gKm5vdCogbW92ZSB0aGlzIGluc2lkZSB0aGUgZmx1c2goKSBmdW5jdGlvblxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gZmx1c2goKSB7XG5cdC8vIERvIG5vdCByZWVudGVyIGZsdXNoIHdoaWxlIGRpcnR5IGNvbXBvbmVudHMgYXJlIHVwZGF0ZWQsIGFzIHRoaXMgY2FuXG5cdC8vIHJlc3VsdCBpbiBhbiBpbmZpbml0ZSBsb29wLiBJbnN0ZWFkLCBsZXQgdGhlIGlubmVyIGZsdXNoIGhhbmRsZSBpdC5cblx0Ly8gUmVlbnRyYW5jeSBpcyBvayBhZnRlcndhcmRzIGZvciBiaW5kaW5ncyBldGMuXG5cdGlmIChmbHVzaGlkeCAhPT0gMCkge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCBzYXZlZF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcblx0ZG8ge1xuXHRcdC8vIGZpcnN0LCBjYWxsIGJlZm9yZVVwZGF0ZSBmdW5jdGlvbnNcblx0XHQvLyBhbmQgdXBkYXRlIGNvbXBvbmVudHNcblx0XHR0cnkge1xuXHRcdFx0d2hpbGUgKGZsdXNoaWR4IDwgZGlydHlfY29tcG9uZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0Y29uc3QgY29tcG9uZW50ID0gZGlydHlfY29tcG9uZW50c1tmbHVzaGlkeF07XG5cdFx0XHRcdGZsdXNoaWR4Kys7XG5cdFx0XHRcdHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpO1xuXHRcdFx0XHR1cGRhdGUoY29tcG9uZW50LiQkKTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvLyByZXNldCBkaXJ0eSBzdGF0ZSB0byBub3QgZW5kIHVwIGluIGEgZGVhZGxvY2tlZCBzdGF0ZSBhbmQgdGhlbiByZXRocm93XG5cdFx0XHRkaXJ0eV9jb21wb25lbnRzLmxlbmd0aCA9IDA7XG5cdFx0XHRmbHVzaGlkeCA9IDA7XG5cdFx0XHR0aHJvdyBlO1xuXHRcdH1cblx0XHRzZXRfY3VycmVudF9jb21wb25lbnQobnVsbCk7XG5cdFx0ZGlydHlfY29tcG9uZW50cy5sZW5ndGggPSAwO1xuXHRcdGZsdXNoaWR4ID0gMDtcblx0XHR3aGlsZSAoYmluZGluZ19jYWxsYmFja3MubGVuZ3RoKSBiaW5kaW5nX2NhbGxiYWNrcy5wb3AoKSgpO1xuXHRcdC8vIHRoZW4sIG9uY2UgY29tcG9uZW50cyBhcmUgdXBkYXRlZCwgY2FsbFxuXHRcdC8vIGFmdGVyVXBkYXRlIGZ1bmN0aW9ucy4gVGhpcyBtYXkgY2F1c2Vcblx0XHQvLyBzdWJzZXF1ZW50IHVwZGF0ZXMuLi5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcl9jYWxsYmFja3MubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGNvbnN0IGNhbGxiYWNrID0gcmVuZGVyX2NhbGxiYWNrc1tpXTtcblx0XHRcdGlmICghc2Vlbl9jYWxsYmFja3MuaGFzKGNhbGxiYWNrKSkge1xuXHRcdFx0XHQvLyAuLi5zbyBndWFyZCBhZ2FpbnN0IGluZmluaXRlIGxvb3BzXG5cdFx0XHRcdHNlZW5fY2FsbGJhY2tzLmFkZChjYWxsYmFjayk7XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJlbmRlcl9jYWxsYmFja3MubGVuZ3RoID0gMDtcblx0fSB3aGlsZSAoZGlydHlfY29tcG9uZW50cy5sZW5ndGgpO1xuXHR3aGlsZSAoZmx1c2hfY2FsbGJhY2tzLmxlbmd0aCkge1xuXHRcdGZsdXNoX2NhbGxiYWNrcy5wb3AoKSgpO1xuXHR9XG5cdHVwZGF0ZV9zY2hlZHVsZWQgPSBmYWxzZTtcblx0c2Vlbl9jYWxsYmFja3MuY2xlYXIoKTtcblx0c2V0X2N1cnJlbnRfY29tcG9uZW50KHNhdmVkX2NvbXBvbmVudCk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmZ1bmN0aW9uIHVwZGF0ZSgkJCkge1xuXHRpZiAoJCQuZnJhZ21lbnQgIT09IG51bGwpIHtcblx0XHQkJC51cGRhdGUoKTtcblx0XHRydW5fYWxsKCQkLmJlZm9yZV91cGRhdGUpO1xuXHRcdGNvbnN0IGRpcnR5ID0gJCQuZGlydHk7XG5cdFx0JCQuZGlydHkgPSBbLTFdO1xuXHRcdCQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50LnAoJCQuY3R4LCBkaXJ0eSk7XG5cdFx0JCQuYWZ0ZXJfdXBkYXRlLmZvckVhY2goYWRkX3JlbmRlcl9jYWxsYmFjayk7XG5cdH1cbn1cblxuLyoqXG4gKiBVc2VmdWwgZm9yIGV4YW1wbGUgdG8gZXhlY3V0ZSByZW1haW5pbmcgYGFmdGVyVXBkYXRlYCBjYWxsYmFja3MgYmVmb3JlIGV4ZWN1dGluZyBgZGVzdHJveWAuXG4gKiBAcGFyYW0ge0Z1bmN0aW9uW119IGZuc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbHVzaF9yZW5kZXJfY2FsbGJhY2tzKGZucykge1xuXHRjb25zdCBmaWx0ZXJlZCA9IFtdO1xuXHRjb25zdCB0YXJnZXRzID0gW107XG5cdHJlbmRlcl9jYWxsYmFja3MuZm9yRWFjaCgoYykgPT4gKGZucy5pbmRleE9mKGMpID09PSAtMSA/IGZpbHRlcmVkLnB1c2goYykgOiB0YXJnZXRzLnB1c2goYykpKTtcblx0dGFyZ2V0cy5mb3JFYWNoKChjKSA9PiBjKCkpO1xuXHRyZW5kZXJfY2FsbGJhY2tzID0gZmlsdGVyZWQ7XG59XG4iLCJpbXBvcnQgeyBpZGVudGl0eSBhcyBsaW5lYXIsIGlzX2Z1bmN0aW9uLCBub29wLCBydW5fYWxsIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgeyBub3cgfSBmcm9tICcuL2Vudmlyb25tZW50LmpzJztcbmltcG9ydCB7IGxvb3AgfSBmcm9tICcuL2xvb3AuanMnO1xuaW1wb3J0IHsgY3JlYXRlX3J1bGUsIGRlbGV0ZV9ydWxlIH0gZnJvbSAnLi9zdHlsZV9tYW5hZ2VyLmpzJztcbmltcG9ydCB7IGN1c3RvbV9ldmVudCB9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7IGFkZF9yZW5kZXJfY2FsbGJhY2sgfSBmcm9tICcuL3NjaGVkdWxlci5qcyc7XG5cbi8qKlxuICogQHR5cGUge1Byb21pc2U8dm9pZD4gfCBudWxsfVxuICovXG5sZXQgcHJvbWlzZTtcblxuLyoqXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cbiAqL1xuZnVuY3Rpb24gd2FpdCgpIHtcblx0aWYgKCFwcm9taXNlKSB7XG5cdFx0cHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdHByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRwcm9taXNlID0gbnVsbDtcblx0XHR9KTtcblx0fVxuXHRyZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IG5vZGVcbiAqIEBwYXJhbSB7SU5UUk8gfCBPVVRSTyB8IGJvb2xlYW59IGRpcmVjdGlvblxuICogQHBhcmFtIHsnc3RhcnQnIHwgJ2VuZCd9IGtpbmRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5mdW5jdGlvbiBkaXNwYXRjaChub2RlLCBkaXJlY3Rpb24sIGtpbmQpIHtcblx0bm9kZS5kaXNwYXRjaEV2ZW50KGN1c3RvbV9ldmVudChgJHtkaXJlY3Rpb24gPyAnaW50cm8nIDogJ291dHJvJ30ke2tpbmR9YCkpO1xufVxuXG5jb25zdCBvdXRyb2luZyA9IG5ldyBTZXQoKTtcblxuLyoqXG4gKiBAdHlwZSB7T3V0cm99XG4gKi9cbmxldCBvdXRyb3M7XG5cbi8qKlxuICogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBfb3V0cm9zKCkge1xuXHRvdXRyb3MgPSB7XG5cdFx0cjogMCxcblx0XHRjOiBbXSxcblx0XHRwOiBvdXRyb3MgLy8gcGFyZW50IGdyb3VwXG5cdH07XG59XG5cbi8qKlxuICogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tfb3V0cm9zKCkge1xuXHRpZiAoIW91dHJvcy5yKSB7XG5cdFx0cnVuX2FsbChvdXRyb3MuYyk7XG5cdH1cblx0b3V0cm9zID0gb3V0cm9zLnA7XG59XG5cbi8qKlxuICogQHBhcmFtIHtpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLkZyYWdtZW50fSBibG9ja1xuICogQHBhcmFtIHswIHwgMX0gW2xvY2FsXVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2l0aW9uX2luKGJsb2NrLCBsb2NhbCkge1xuXHRpZiAoYmxvY2sgJiYgYmxvY2suaSkge1xuXHRcdG91dHJvaW5nLmRlbGV0ZShibG9jayk7XG5cdFx0YmxvY2suaShsb2NhbCk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuRnJhZ21lbnR9IGJsb2NrXG4gKiBAcGFyYW0gezAgfCAxfSBsb2NhbFxuICogQHBhcmFtIHswIHwgMX0gW2RldGFjaF1cbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gW2NhbGxiYWNrXVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2l0aW9uX291dChibG9jaywgbG9jYWwsIGRldGFjaCwgY2FsbGJhY2spIHtcblx0aWYgKGJsb2NrICYmIGJsb2NrLm8pIHtcblx0XHRpZiAob3V0cm9pbmcuaGFzKGJsb2NrKSkgcmV0dXJuO1xuXHRcdG91dHJvaW5nLmFkZChibG9jayk7XG5cdFx0b3V0cm9zLmMucHVzaCgoKSA9PiB7XG5cdFx0XHRvdXRyb2luZy5kZWxldGUoYmxvY2spO1xuXHRcdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmIChkZXRhY2gpIGJsb2NrLmQoMSk7XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0YmxvY2subyhsb2NhbCk7XG5cdH0gZWxzZSBpZiAoY2FsbGJhY2spIHtcblx0XHRjYWxsYmFjaygpO1xuXHR9XG59XG5cbi8qKlxuICogQHR5cGUge2ltcG9ydCgnLi4vdHJhbnNpdGlvbi9wdWJsaWMuanMnKS5UcmFuc2l0aW9uQ29uZmlnfVxuICovXG5jb25zdCBudWxsX3RyYW5zaXRpb24gPSB7IGR1cmF0aW9uOiAwIH07XG5cbi8qKlxuICogQHBhcmFtIHtFbGVtZW50ICYgRWxlbWVudENTU0lubGluZVN0eWxlfSBub2RlXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25Gbn0gZm5cbiAqIEBwYXJhbSB7YW55fSBwYXJhbXNcbiAqIEByZXR1cm5zIHt7IHN0YXJ0KCk6IHZvaWQ7IGludmFsaWRhdGUoKTogdm9pZDsgZW5kKCk6IHZvaWQ7IH19XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVfaW5fdHJhbnNpdGlvbihub2RlLCBmbiwgcGFyYW1zKSB7XG5cdC8qKlxuXHQgKiBAdHlwZSB7VHJhbnNpdGlvbk9wdGlvbnN9ICovXG5cdGNvbnN0IG9wdGlvbnMgPSB7IGRpcmVjdGlvbjogJ2luJyB9O1xuXHRsZXQgY29uZmlnID0gZm4obm9kZSwgcGFyYW1zLCBvcHRpb25zKTtcblx0bGV0IHJ1bm5pbmcgPSBmYWxzZTtcblx0bGV0IGFuaW1hdGlvbl9uYW1lO1xuXHRsZXQgdGFzaztcblx0bGV0IHVpZCA9IDA7XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBjbGVhbnVwKCkge1xuXHRcdGlmIChhbmltYXRpb25fbmFtZSkgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBnbygpIHtcblx0XHRjb25zdCB7XG5cdFx0XHRkZWxheSA9IDAsXG5cdFx0XHRkdXJhdGlvbiA9IDMwMCxcblx0XHRcdGVhc2luZyA9IGxpbmVhcixcblx0XHRcdHRpY2sgPSBub29wLFxuXHRcdFx0Y3NzXG5cdFx0fSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG5cdFx0aWYgKGNzcykgYW5pbWF0aW9uX25hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzLCB1aWQrKyk7XG5cdFx0dGljaygwLCAxKTtcblx0XHRjb25zdCBzdGFydF90aW1lID0gbm93KCkgKyBkZWxheTtcblx0XHRjb25zdCBlbmRfdGltZSA9IHN0YXJ0X3RpbWUgKyBkdXJhdGlvbjtcblx0XHRpZiAodGFzaykgdGFzay5hYm9ydCgpO1xuXHRcdHJ1bm5pbmcgPSB0cnVlO1xuXHRcdGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgdHJ1ZSwgJ3N0YXJ0JykpO1xuXHRcdHRhc2sgPSBsb29wKChub3cpID0+IHtcblx0XHRcdGlmIChydW5uaW5nKSB7XG5cdFx0XHRcdGlmIChub3cgPj0gZW5kX3RpbWUpIHtcblx0XHRcdFx0XHR0aWNrKDEsIDApO1xuXHRcdFx0XHRcdGRpc3BhdGNoKG5vZGUsIHRydWUsICdlbmQnKTtcblx0XHRcdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHRcdFx0cmV0dXJuIChydW5uaW5nID0gZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChub3cgPj0gc3RhcnRfdGltZSkge1xuXHRcdFx0XHRcdGNvbnN0IHQgPSBlYXNpbmcoKG5vdyAtIHN0YXJ0X3RpbWUpIC8gZHVyYXRpb24pO1xuXHRcdFx0XHRcdHRpY2sodCwgMSAtIHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcnVubmluZztcblx0XHR9KTtcblx0fVxuXHRsZXQgc3RhcnRlZCA9IGZhbHNlO1xuXHRyZXR1cm4ge1xuXHRcdHN0YXJ0KCkge1xuXHRcdFx0aWYgKHN0YXJ0ZWQpIHJldHVybjtcblx0XHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdFx0ZGVsZXRlX3J1bGUobm9kZSk7XG5cdFx0XHRpZiAoaXNfZnVuY3Rpb24oY29uZmlnKSkge1xuXHRcdFx0XHRjb25maWcgPSBjb25maWcob3B0aW9ucyk7XG5cdFx0XHRcdHdhaXQoKS50aGVuKGdvKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdvKCk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRpbnZhbGlkYXRlKCkge1xuXHRcdFx0c3RhcnRlZCA9IGZhbHNlO1xuXHRcdH0sXG5cdFx0ZW5kKCkge1xuXHRcdFx0aWYgKHJ1bm5pbmcpIHtcblx0XHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0XHRydW5uaW5nID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RWxlbWVudCAmIEVsZW1lbnRDU1NJbmxpbmVTdHlsZX0gbm9kZVxuICogQHBhcmFtIHtUcmFuc2l0aW9uRm59IGZuXG4gKiBAcGFyYW0ge2FueX0gcGFyYW1zXG4gKiBAcmV0dXJucyB7eyBlbmQocmVzZXQ6IGFueSk6IHZvaWQ7IH19XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVfb3V0X3RyYW5zaXRpb24obm9kZSwgZm4sIHBhcmFtcykge1xuXHQvKiogQHR5cGUge1RyYW5zaXRpb25PcHRpb25zfSAqL1xuXHRjb25zdCBvcHRpb25zID0geyBkaXJlY3Rpb246ICdvdXQnIH07XG5cdGxldCBjb25maWcgPSBmbihub2RlLCBwYXJhbXMsIG9wdGlvbnMpO1xuXHRsZXQgcnVubmluZyA9IHRydWU7XG5cdGxldCBhbmltYXRpb25fbmFtZTtcblx0Y29uc3QgZ3JvdXAgPSBvdXRyb3M7XG5cdGdyb3VwLnIgKz0gMTtcblx0LyoqIEB0eXBlIHtib29sZWFufSAqL1xuXHRsZXQgb3JpZ2luYWxfaW5lcnRfdmFsdWU7XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBnbygpIHtcblx0XHRjb25zdCB7XG5cdFx0XHRkZWxheSA9IDAsXG5cdFx0XHRkdXJhdGlvbiA9IDMwMCxcblx0XHRcdGVhc2luZyA9IGxpbmVhcixcblx0XHRcdHRpY2sgPSBub29wLFxuXHRcdFx0Y3NzXG5cdFx0fSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG5cblx0XHRpZiAoY3NzKSBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDEsIDAsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuXG5cdFx0Y29uc3Qgc3RhcnRfdGltZSA9IG5vdygpICsgZGVsYXk7XG5cdFx0Y29uc3QgZW5kX3RpbWUgPSBzdGFydF90aW1lICsgZHVyYXRpb247XG5cdFx0YWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiBkaXNwYXRjaChub2RlLCBmYWxzZSwgJ3N0YXJ0JykpO1xuXG5cdFx0aWYgKCdpbmVydCcgaW4gbm9kZSkge1xuXHRcdFx0b3JpZ2luYWxfaW5lcnRfdmFsdWUgPSAvKiogQHR5cGUge0hUTUxFbGVtZW50fSAqLyAobm9kZSkuaW5lcnQ7XG5cdFx0XHRub2RlLmluZXJ0ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRsb29wKChub3cpID0+IHtcblx0XHRcdGlmIChydW5uaW5nKSB7XG5cdFx0XHRcdGlmIChub3cgPj0gZW5kX3RpbWUpIHtcblx0XHRcdFx0XHR0aWNrKDAsIDEpO1xuXHRcdFx0XHRcdGRpc3BhdGNoKG5vZGUsIGZhbHNlLCAnZW5kJyk7XG5cdFx0XHRcdFx0aWYgKCEtLWdyb3VwLnIpIHtcblx0XHRcdFx0XHRcdC8vIHRoaXMgd2lsbCByZXN1bHQgaW4gYGVuZCgpYCBiZWluZyBjYWxsZWQsXG5cdFx0XHRcdFx0XHQvLyBzbyB3ZSBkb24ndCBuZWVkIHRvIGNsZWFuIHVwIGhlcmVcblx0XHRcdFx0XHRcdHJ1bl9hbGwoZ3JvdXAuYyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobm93ID49IHN0YXJ0X3RpbWUpIHtcblx0XHRcdFx0XHRjb25zdCB0ID0gZWFzaW5nKChub3cgLSBzdGFydF90aW1lKSAvIGR1cmF0aW9uKTtcblx0XHRcdFx0XHR0aWNrKDEgLSB0LCB0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJ1bm5pbmc7XG5cdFx0fSk7XG5cdH1cblxuXHRpZiAoaXNfZnVuY3Rpb24oY29uZmlnKSkge1xuXHRcdHdhaXQoKS50aGVuKCgpID0+IHtcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdGNvbmZpZyA9IGNvbmZpZyhvcHRpb25zKTtcblx0XHRcdGdvKCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0Z28oKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0ZW5kKHJlc2V0KSB7XG5cdFx0XHRpZiAocmVzZXQgJiYgJ2luZXJ0JyBpbiBub2RlKSB7XG5cdFx0XHRcdG5vZGUuaW5lcnQgPSBvcmlnaW5hbF9pbmVydF92YWx1ZTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNldCAmJiBjb25maWcudGljaykge1xuXHRcdFx0XHRjb25maWcudGljaygxLCAwKTtcblx0XHRcdH1cblx0XHRcdGlmIChydW5uaW5nKSB7XG5cdFx0XHRcdGlmIChhbmltYXRpb25fbmFtZSkgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuXHRcdFx0XHRydW5uaW5nID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RWxlbWVudCAmIEVsZW1lbnRDU1NJbmxpbmVTdHlsZX0gbm9kZVxuICogQHBhcmFtIHtUcmFuc2l0aW9uRm59IGZuXG4gKiBAcGFyYW0ge2FueX0gcGFyYW1zXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGludHJvXG4gKiBAcmV0dXJucyB7eyBydW4oYjogMCB8IDEpOiB2b2lkOyBlbmQoKTogdm9pZDsgfX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9iaWRpcmVjdGlvbmFsX3RyYW5zaXRpb24obm9kZSwgZm4sIHBhcmFtcywgaW50cm8pIHtcblx0LyoqXG5cdCAqIEB0eXBlIHtUcmFuc2l0aW9uT3B0aW9uc30gKi9cblx0Y29uc3Qgb3B0aW9ucyA9IHsgZGlyZWN0aW9uOiAnYm90aCcgfTtcblx0bGV0IGNvbmZpZyA9IGZuKG5vZGUsIHBhcmFtcywgb3B0aW9ucyk7XG5cdGxldCB0ID0gaW50cm8gPyAwIDogMTtcblxuXHQvKipcblx0ICogQHR5cGUge1Byb2dyYW0gfCBudWxsfSAqL1xuXHRsZXQgcnVubmluZ19wcm9ncmFtID0gbnVsbDtcblxuXHQvKipcblx0ICogQHR5cGUge1BlbmRpbmdQcm9ncmFtIHwgbnVsbH0gKi9cblx0bGV0IHBlbmRpbmdfcHJvZ3JhbSA9IG51bGw7XG5cdGxldCBhbmltYXRpb25fbmFtZSA9IG51bGw7XG5cblx0LyoqIEB0eXBlIHtib29sZWFufSAqL1xuXHRsZXQgb3JpZ2luYWxfaW5lcnRfdmFsdWU7XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHRmdW5jdGlvbiBjbGVhcl9hbmltYXRpb24oKSB7XG5cdFx0aWYgKGFuaW1hdGlvbl9uYW1lKSBkZWxldGVfcnVsZShub2RlLCBhbmltYXRpb25fbmFtZSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtQZW5kaW5nUHJvZ3JhbX0gcHJvZ3JhbVxuXHQgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb25cblx0ICogQHJldHVybnMge1Byb2dyYW19XG5cdCAqL1xuXHRmdW5jdGlvbiBpbml0KHByb2dyYW0sIGR1cmF0aW9uKSB7XG5cdFx0Y29uc3QgZCA9IC8qKiBAdHlwZSB7UHJvZ3JhbVsnZCddfSAqLyAocHJvZ3JhbS5iIC0gdCk7XG5cdFx0ZHVyYXRpb24gKj0gTWF0aC5hYnMoZCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGE6IHQsXG5cdFx0XHRiOiBwcm9ncmFtLmIsXG5cdFx0XHRkLFxuXHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRzdGFydDogcHJvZ3JhbS5zdGFydCxcblx0XHRcdGVuZDogcHJvZ3JhbS5zdGFydCArIGR1cmF0aW9uLFxuXHRcdFx0Z3JvdXA6IHByb2dyYW0uZ3JvdXBcblx0XHR9O1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7SU5UUk8gfCBPVVRST30gYlxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGZ1bmN0aW9uIGdvKGIpIHtcblx0XHRjb25zdCB7XG5cdFx0XHRkZWxheSA9IDAsXG5cdFx0XHRkdXJhdGlvbiA9IDMwMCxcblx0XHRcdGVhc2luZyA9IGxpbmVhcixcblx0XHRcdHRpY2sgPSBub29wLFxuXHRcdFx0Y3NzXG5cdFx0fSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG5cblx0XHQvKipcblx0XHQgKiBAdHlwZSB7UGVuZGluZ1Byb2dyYW19ICovXG5cdFx0Y29uc3QgcHJvZ3JhbSA9IHtcblx0XHRcdHN0YXJ0OiBub3coKSArIGRlbGF5LFxuXHRcdFx0YlxuXHRcdH07XG5cblx0XHRpZiAoIWIpIHtcblx0XHRcdC8vIEB0cy1pZ25vcmUgdG9kbzogaW1wcm92ZSB0eXBpbmdzXG5cdFx0XHRwcm9ncmFtLmdyb3VwID0gb3V0cm9zO1xuXHRcdFx0b3V0cm9zLnIgKz0gMTtcblx0XHR9XG5cblx0XHRpZiAoJ2luZXJ0JyBpbiBub2RlKSB7XG5cdFx0XHRpZiAoYikge1xuXHRcdFx0XHRpZiAob3JpZ2luYWxfaW5lcnRfdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdC8vIGFib3J0ZWQvcmV2ZXJzZWQgb3V0cm8g4oCUIHJlc3RvcmUgcHJldmlvdXMgaW5lcnQgdmFsdWVcblx0XHRcdFx0XHRub2RlLmluZXJ0ID0gb3JpZ2luYWxfaW5lcnRfdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG9yaWdpbmFsX2luZXJ0X3ZhbHVlID0gLyoqIEB0eXBlIHtIVE1MRWxlbWVudH0gKi8gKG5vZGUpLmluZXJ0O1xuXHRcdFx0XHRub2RlLmluZXJ0ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAocnVubmluZ19wcm9ncmFtIHx8IHBlbmRpbmdfcHJvZ3JhbSkge1xuXHRcdFx0cGVuZGluZ19wcm9ncmFtID0gcHJvZ3JhbTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gaWYgdGhpcyBpcyBhbiBpbnRybywgYW5kIHRoZXJlJ3MgYSBkZWxheSwgd2UgbmVlZCB0byBkb1xuXHRcdFx0Ly8gYW4gaW5pdGlhbCB0aWNrIGFuZC9vciBhcHBseSBDU1MgYW5pbWF0aW9uIGltbWVkaWF0ZWx5XG5cdFx0XHRpZiAoY3NzKSB7XG5cdFx0XHRcdGNsZWFyX2FuaW1hdGlvbigpO1xuXHRcdFx0XHRhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIHQsIGIsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGIpIHRpY2soMCwgMSk7XG5cdFx0XHRydW5uaW5nX3Byb2dyYW0gPSBpbml0KHByb2dyYW0sIGR1cmF0aW9uKTtcblx0XHRcdGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgYiwgJ3N0YXJ0JykpO1xuXHRcdFx0bG9vcCgobm93KSA9PiB7XG5cdFx0XHRcdGlmIChwZW5kaW5nX3Byb2dyYW0gJiYgbm93ID4gcGVuZGluZ19wcm9ncmFtLnN0YXJ0KSB7XG5cdFx0XHRcdFx0cnVubmluZ19wcm9ncmFtID0gaW5pdChwZW5kaW5nX3Byb2dyYW0sIGR1cmF0aW9uKTtcblx0XHRcdFx0XHRwZW5kaW5nX3Byb2dyYW0gPSBudWxsO1xuXHRcdFx0XHRcdGRpc3BhdGNoKG5vZGUsIHJ1bm5pbmdfcHJvZ3JhbS5iLCAnc3RhcnQnKTtcblx0XHRcdFx0XHRpZiAoY3NzKSB7XG5cdFx0XHRcdFx0XHRjbGVhcl9hbmltYXRpb24oKTtcblx0XHRcdFx0XHRcdGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUoXG5cdFx0XHRcdFx0XHRcdG5vZGUsXG5cdFx0XHRcdFx0XHRcdHQsXG5cdFx0XHRcdFx0XHRcdHJ1bm5pbmdfcHJvZ3JhbS5iLFxuXHRcdFx0XHRcdFx0XHRydW5uaW5nX3Byb2dyYW0uZHVyYXRpb24sXG5cdFx0XHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0XHRcdGVhc2luZyxcblx0XHRcdFx0XHRcdFx0Y29uZmlnLmNzc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bm5pbmdfcHJvZ3JhbSkge1xuXHRcdFx0XHRcdGlmIChub3cgPj0gcnVubmluZ19wcm9ncmFtLmVuZCkge1xuXHRcdFx0XHRcdFx0dGljaygodCA9IHJ1bm5pbmdfcHJvZ3JhbS5iKSwgMSAtIHQpO1xuXHRcdFx0XHRcdFx0ZGlzcGF0Y2gobm9kZSwgcnVubmluZ19wcm9ncmFtLmIsICdlbmQnKTtcblx0XHRcdFx0XHRcdGlmICghcGVuZGluZ19wcm9ncmFtKSB7XG5cdFx0XHRcdFx0XHRcdC8vIHdlJ3JlIGRvbmVcblx0XHRcdFx0XHRcdFx0aWYgKHJ1bm5pbmdfcHJvZ3JhbS5iKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gaW50cm8g4oCUIHdlIGNhbiB0aWR5IHVwIGltbWVkaWF0ZWx5XG5cdFx0XHRcdFx0XHRcdFx0Y2xlYXJfYW5pbWF0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gb3V0cm8g4oCUIG5lZWRzIHRvIGJlIGNvb3JkaW5hdGVkXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCEtLXJ1bm5pbmdfcHJvZ3JhbS5ncm91cC5yKSBydW5fYWxsKHJ1bm5pbmdfcHJvZ3JhbS5ncm91cC5jKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cnVubmluZ19wcm9ncmFtID0gbnVsbDtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG5vdyA+PSBydW5uaW5nX3Byb2dyYW0uc3RhcnQpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHAgPSBub3cgLSBydW5uaW5nX3Byb2dyYW0uc3RhcnQ7XG5cdFx0XHRcdFx0XHR0ID0gcnVubmluZ19wcm9ncmFtLmEgKyBydW5uaW5nX3Byb2dyYW0uZCAqIGVhc2luZyhwIC8gcnVubmluZ19wcm9ncmFtLmR1cmF0aW9uKTtcblx0XHRcdFx0XHRcdHRpY2sodCwgMSAtIHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gISEocnVubmluZ19wcm9ncmFtIHx8IHBlbmRpbmdfcHJvZ3JhbSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHtcblx0XHRydW4oYikge1xuXHRcdFx0aWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcblx0XHRcdFx0d2FpdCgpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IG9wdHMgPSB7IGRpcmVjdGlvbjogYiA/ICdpbicgOiAnb3V0JyB9O1xuXHRcdFx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0XHRjb25maWcgPSBjb25maWcob3B0cyk7XG5cdFx0XHRcdFx0Z28oYik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Z28oYik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbmQoKSB7XG5cdFx0XHRjbGVhcl9hbmltYXRpb24oKTtcblx0XHRcdHJ1bm5pbmdfcHJvZ3JhbSA9IHBlbmRpbmdfcHJvZ3JhbSA9IG51bGw7XG5cdFx0fVxuXHR9O1xufVxuXG4vKiogQHR5cGVkZWYgezF9IElOVFJPICovXG4vKiogQHR5cGVkZWYgezB9IE9VVFJPICovXG4vKiogQHR5cGVkZWYge3sgZGlyZWN0aW9uOiAnaW4nIHwgJ291dCcgfCAnYm90aCcgfX0gVHJhbnNpdGlvbk9wdGlvbnMgKi9cbi8qKiBAdHlwZWRlZiB7KG5vZGU6IEVsZW1lbnQsIHBhcmFtczogYW55LCBvcHRpb25zOiBUcmFuc2l0aW9uT3B0aW9ucykgPT4gaW1wb3J0KCcuLi90cmFuc2l0aW9uL3B1YmxpYy5qcycpLlRyYW5zaXRpb25Db25maWd9IFRyYW5zaXRpb25GbiAqL1xuXG4vKipcbiAqIEB0eXBlZGVmIHtPYmplY3R9IE91dHJvXG4gKiBAcHJvcGVydHkge251bWJlcn0gclxuICogQHByb3BlcnR5IHtGdW5jdGlvbltdfSBjXG4gKiBAcHJvcGVydHkge09iamVjdH0gcFxuICovXG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gUGVuZGluZ1Byb2dyYW1cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzdGFydFxuICogQHByb3BlcnR5IHtJTlRST3xPVVRST30gYlxuICogQHByb3BlcnR5IHtPdXRyb30gW2dyb3VwXVxuICovXG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gUHJvZ3JhbVxuICogQHByb3BlcnR5IHtudW1iZXJ9IGFcbiAqIEBwcm9wZXJ0eSB7SU5UUk98T1VUUk99IGJcbiAqIEBwcm9wZXJ0eSB7MXwtMX0gZFxuICogQHByb3BlcnR5IHtudW1iZXJ9IGR1cmF0aW9uXG4gKiBAcHJvcGVydHkge251bWJlcn0gc3RhcnRcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBlbmRcbiAqIEBwcm9wZXJ0eSB7T3V0cm99IFtncm91cF1cbiAqL1xuIiwiaW1wb3J0IHsgdHJhbnNpdGlvbl9pbiwgdHJhbnNpdGlvbl9vdXQgfSBmcm9tICcuL3RyYW5zaXRpb25zLmpzJztcbmltcG9ydCB7IHJ1bl9hbGwgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuLy8gZ2VuZXJhbCBlYWNoIGZ1bmN0aW9uczpcblxuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZV9hcnJheV9saWtlKGFycmF5X2xpa2Vfb3JfaXRlcmF0b3IpIHtcblx0cmV0dXJuIGFycmF5X2xpa2Vfb3JfaXRlcmF0b3I/Lmxlbmd0aCAhPT0gdW5kZWZpbmVkXG5cdFx0PyBhcnJheV9saWtlX29yX2l0ZXJhdG9yXG5cdFx0OiBBcnJheS5mcm9tKGFycmF5X2xpa2Vfb3JfaXRlcmF0b3IpO1xufVxuXG4vLyBrZXllZCBlYWNoIGZ1bmN0aW9uczpcblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuXHRibG9jay5kKDEpO1xuXHRsb29rdXAuZGVsZXRlKGJsb2NrLmtleSk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBvdXRyb19hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG5cdHRyYW5zaXRpb25fb3V0KGJsb2NrLCAxLCAxLCAoKSA9PiB7XG5cdFx0bG9va3VwLmRlbGV0ZShibG9jay5rZXkpO1xuXHR9KTtcbn1cblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpeF9hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG5cdGJsb2NrLmYoKTtcblx0ZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKTtcbn1cblxuLyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpeF9hbmRfb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuXHRibG9jay5mKCk7XG5cdG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApO1xufVxuXG4vKiogQHJldHVybnMge2FueVtdfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZV9rZXllZF9lYWNoKFxuXHRvbGRfYmxvY2tzLFxuXHRkaXJ0eSxcblx0Z2V0X2tleSxcblx0ZHluYW1pYyxcblx0Y3R4LFxuXHRsaXN0LFxuXHRsb29rdXAsXG5cdG5vZGUsXG5cdGRlc3Ryb3ksXG5cdGNyZWF0ZV9lYWNoX2Jsb2NrLFxuXHRuZXh0LFxuXHRnZXRfY29udGV4dFxuKSB7XG5cdGxldCBvID0gb2xkX2Jsb2Nrcy5sZW5ndGg7XG5cdGxldCBuID0gbGlzdC5sZW5ndGg7XG5cdGxldCBpID0gbztcblx0Y29uc3Qgb2xkX2luZGV4ZXMgPSB7fTtcblx0d2hpbGUgKGktLSkgb2xkX2luZGV4ZXNbb2xkX2Jsb2Nrc1tpXS5rZXldID0gaTtcblx0Y29uc3QgbmV3X2Jsb2NrcyA9IFtdO1xuXHRjb25zdCBuZXdfbG9va3VwID0gbmV3IE1hcCgpO1xuXHRjb25zdCBkZWx0YXMgPSBuZXcgTWFwKCk7XG5cdGNvbnN0IHVwZGF0ZXMgPSBbXTtcblx0aSA9IG47XG5cdHdoaWxlIChpLS0pIHtcblx0XHRjb25zdCBjaGlsZF9jdHggPSBnZXRfY29udGV4dChjdHgsIGxpc3QsIGkpO1xuXHRcdGNvbnN0IGtleSA9IGdldF9rZXkoY2hpbGRfY3R4KTtcblx0XHRsZXQgYmxvY2sgPSBsb29rdXAuZ2V0KGtleSk7XG5cdFx0aWYgKCFibG9jaykge1xuXHRcdFx0YmxvY2sgPSBjcmVhdGVfZWFjaF9ibG9jayhrZXksIGNoaWxkX2N0eCk7XG5cdFx0XHRibG9jay5jKCk7XG5cdFx0fSBlbHNlIGlmIChkeW5hbWljKSB7XG5cdFx0XHQvLyBkZWZlciB1cGRhdGVzIHVudGlsIGFsbCB0aGUgRE9NIHNodWZmbGluZyBpcyBkb25lXG5cdFx0XHR1cGRhdGVzLnB1c2goKCkgPT4gYmxvY2sucChjaGlsZF9jdHgsIGRpcnR5KSk7XG5cdFx0fVxuXHRcdG5ld19sb29rdXAuc2V0KGtleSwgKG5ld19ibG9ja3NbaV0gPSBibG9jaykpO1xuXHRcdGlmIChrZXkgaW4gb2xkX2luZGV4ZXMpIGRlbHRhcy5zZXQoa2V5LCBNYXRoLmFicyhpIC0gb2xkX2luZGV4ZXNba2V5XSkpO1xuXHR9XG5cdGNvbnN0IHdpbGxfbW92ZSA9IG5ldyBTZXQoKTtcblx0Y29uc3QgZGlkX21vdmUgPSBuZXcgU2V0KCk7XG5cdC8qKiBAcmV0dXJucyB7dm9pZH0gKi9cblx0ZnVuY3Rpb24gaW5zZXJ0KGJsb2NrKSB7XG5cdFx0dHJhbnNpdGlvbl9pbihibG9jaywgMSk7XG5cdFx0YmxvY2subShub2RlLCBuZXh0KTtcblx0XHRsb29rdXAuc2V0KGJsb2NrLmtleSwgYmxvY2spO1xuXHRcdG5leHQgPSBibG9jay5maXJzdDtcblx0XHRuLS07XG5cdH1cblx0d2hpbGUgKG8gJiYgbikge1xuXHRcdGNvbnN0IG5ld19ibG9jayA9IG5ld19ibG9ja3NbbiAtIDFdO1xuXHRcdGNvbnN0IG9sZF9ibG9jayA9IG9sZF9ibG9ja3NbbyAtIDFdO1xuXHRcdGNvbnN0IG5ld19rZXkgPSBuZXdfYmxvY2sua2V5O1xuXHRcdGNvbnN0IG9sZF9rZXkgPSBvbGRfYmxvY2sua2V5O1xuXHRcdGlmIChuZXdfYmxvY2sgPT09IG9sZF9ibG9jaykge1xuXHRcdFx0Ly8gZG8gbm90aGluZ1xuXHRcdFx0bmV4dCA9IG5ld19ibG9jay5maXJzdDtcblx0XHRcdG8tLTtcblx0XHRcdG4tLTtcblx0XHR9IGVsc2UgaWYgKCFuZXdfbG9va3VwLmhhcyhvbGRfa2V5KSkge1xuXHRcdFx0Ly8gcmVtb3ZlIG9sZCBibG9ja1xuXHRcdFx0ZGVzdHJveShvbGRfYmxvY2ssIGxvb2t1cCk7XG5cdFx0XHRvLS07XG5cdFx0fSBlbHNlIGlmICghbG9va3VwLmhhcyhuZXdfa2V5KSB8fCB3aWxsX21vdmUuaGFzKG5ld19rZXkpKSB7XG5cdFx0XHRpbnNlcnQobmV3X2Jsb2NrKTtcblx0XHR9IGVsc2UgaWYgKGRpZF9tb3ZlLmhhcyhvbGRfa2V5KSkge1xuXHRcdFx0by0tO1xuXHRcdH0gZWxzZSBpZiAoZGVsdGFzLmdldChuZXdfa2V5KSA+IGRlbHRhcy5nZXQob2xkX2tleSkpIHtcblx0XHRcdGRpZF9tb3ZlLmFkZChuZXdfa2V5KTtcblx0XHRcdGluc2VydChuZXdfYmxvY2spO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR3aWxsX21vdmUuYWRkKG9sZF9rZXkpO1xuXHRcdFx0by0tO1xuXHRcdH1cblx0fVxuXHR3aGlsZSAoby0tKSB7XG5cdFx0Y29uc3Qgb2xkX2Jsb2NrID0gb2xkX2Jsb2Nrc1tvXTtcblx0XHRpZiAoIW5ld19sb29rdXAuaGFzKG9sZF9ibG9jay5rZXkpKSBkZXN0cm95KG9sZF9ibG9jaywgbG9va3VwKTtcblx0fVxuXHR3aGlsZSAobikgaW5zZXJ0KG5ld19ibG9ja3NbbiAtIDFdKTtcblx0cnVuX2FsbCh1cGRhdGVzKTtcblx0cmV0dXJuIG5ld19ibG9ja3M7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZV9lYWNoX2tleXMoY3R4LCBsaXN0LCBnZXRfY29udGV4dCwgZ2V0X2tleSkge1xuXHRjb25zdCBrZXlzID0gbmV3IE1hcCgpO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRjb25zdCBrZXkgPSBnZXRfa2V5KGdldF9jb250ZXh0KGN0eCwgbGlzdCwgaSkpO1xuXHRcdGlmIChrZXlzLmhhcyhrZXkpKSB7XG5cdFx0XHRsZXQgdmFsdWUgPSAnJztcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhbHVlID0gYHdpdGggdmFsdWUgJyR7U3RyaW5nKGtleSl9JyBgO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBjYW4ndCBzdHJpbmdpZnlcblx0XHRcdH1cblx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0YENhbm5vdCBoYXZlIGR1cGxpY2F0ZSBrZXlzIGluIGEga2V5ZWQgZWFjaDogS2V5cyBhdCBpbmRleCAke2tleXMuZ2V0KFxuXHRcdFx0XHRcdGtleVxuXHRcdFx0XHQpfSBhbmQgJHtpfSAke3ZhbHVlfWFyZSBkdXBsaWNhdGVzYFxuXHRcdFx0KTtcblx0XHR9XG5cdFx0a2V5cy5zZXQoa2V5LCBpKTtcblx0fVxufVxuIiwiLyoqIEByZXR1cm5zIHt7fX0gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRfc3ByZWFkX3VwZGF0ZShsZXZlbHMsIHVwZGF0ZXMpIHtcblx0Y29uc3QgdXBkYXRlID0ge307XG5cdGNvbnN0IHRvX251bGxfb3V0ID0ge307XG5cdGNvbnN0IGFjY291bnRlZF9mb3IgPSB7ICQkc2NvcGU6IDEgfTtcblx0bGV0IGkgPSBsZXZlbHMubGVuZ3RoO1xuXHR3aGlsZSAoaS0tKSB7XG5cdFx0Y29uc3QgbyA9IGxldmVsc1tpXTtcblx0XHRjb25zdCBuID0gdXBkYXRlc1tpXTtcblx0XHRpZiAobikge1xuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gbykge1xuXHRcdFx0XHRpZiAoIShrZXkgaW4gbikpIHRvX251bGxfb3V0W2tleV0gPSAxO1xuXHRcdFx0fVxuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gbikge1xuXHRcdFx0XHRpZiAoIWFjY291bnRlZF9mb3Jba2V5XSkge1xuXHRcdFx0XHRcdHVwZGF0ZVtrZXldID0gbltrZXldO1xuXHRcdFx0XHRcdGFjY291bnRlZF9mb3Jba2V5XSA9IDE7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGxldmVsc1tpXSA9IG47XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoY29uc3Qga2V5IGluIG8pIHtcblx0XHRcdFx0YWNjb3VudGVkX2ZvcltrZXldID0gMTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0Zm9yIChjb25zdCBrZXkgaW4gdG9fbnVsbF9vdXQpIHtcblx0XHRpZiAoIShrZXkgaW4gdXBkYXRlKSkgdXBkYXRlW2tleV0gPSB1bmRlZmluZWQ7XG5cdH1cblx0cmV0dXJuIHVwZGF0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF9zcHJlYWRfb2JqZWN0KHNwcmVhZF9wcm9wcykge1xuXHRyZXR1cm4gdHlwZW9mIHNwcmVhZF9wcm9wcyA9PT0gJ29iamVjdCcgJiYgc3ByZWFkX3Byb3BzICE9PSBudWxsID8gc3ByZWFkX3Byb3BzIDoge307XG59XG4iLCJpbXBvcnQge1xuXHRhZGRfcmVuZGVyX2NhbGxiYWNrLFxuXHRmbHVzaCxcblx0Zmx1c2hfcmVuZGVyX2NhbGxiYWNrcyxcblx0c2NoZWR1bGVfdXBkYXRlLFxuXHRkaXJ0eV9jb21wb25lbnRzXG59IGZyb20gJy4vc2NoZWR1bGVyLmpzJztcbmltcG9ydCB7IGN1cnJlbnRfY29tcG9uZW50LCBzZXRfY3VycmVudF9jb21wb25lbnQgfSBmcm9tICcuL2xpZmVjeWNsZS5qcyc7XG5pbXBvcnQgeyBibGFua19vYmplY3QsIGlzX2VtcHR5LCBpc19mdW5jdGlvbiwgcnVuLCBydW5fYWxsLCBub29wIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQge1xuXHRjaGlsZHJlbixcblx0ZGV0YWNoLFxuXHRzdGFydF9oeWRyYXRpbmcsXG5cdGVuZF9oeWRyYXRpbmcsXG5cdGdldF9jdXN0b21fZWxlbWVudHNfc2xvdHMsXG5cdGluc2VydCxcblx0ZWxlbWVudCxcblx0YXR0clxufSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQgeyB0cmFuc2l0aW9uX2luIH0gZnJvbSAnLi90cmFuc2l0aW9ucy5qcyc7XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kKGNvbXBvbmVudCwgbmFtZSwgY2FsbGJhY2spIHtcblx0Y29uc3QgaW5kZXggPSBjb21wb25lbnQuJCQucHJvcHNbbmFtZV07XG5cdGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Y29tcG9uZW50LiQkLmJvdW5kW2luZGV4XSA9IGNhbGxiYWNrO1xuXHRcdGNhbGxiYWNrKGNvbXBvbmVudC4kJC5jdHhbaW5kZXhdKTtcblx0fVxufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlX2NvbXBvbmVudChibG9jaykge1xuXHRibG9jayAmJiBibG9jay5jKCk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFpbV9jb21wb25lbnQoYmxvY2ssIHBhcmVudF9ub2Rlcykge1xuXHRibG9jayAmJiBibG9jay5sKHBhcmVudF9ub2Rlcyk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBtb3VudF9jb21wb25lbnQoY29tcG9uZW50LCB0YXJnZXQsIGFuY2hvcikge1xuXHRjb25zdCB7IGZyYWdtZW50LCBhZnRlcl91cGRhdGUgfSA9IGNvbXBvbmVudC4kJDtcblx0ZnJhZ21lbnQgJiYgZnJhZ21lbnQubSh0YXJnZXQsIGFuY2hvcik7XG5cdC8vIG9uTW91bnQgaGFwcGVucyBiZWZvcmUgdGhlIGluaXRpYWwgYWZ0ZXJVcGRhdGVcblx0YWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiB7XG5cdFx0Y29uc3QgbmV3X29uX2Rlc3Ryb3kgPSBjb21wb25lbnQuJCQub25fbW91bnQubWFwKHJ1bikuZmlsdGVyKGlzX2Z1bmN0aW9uKTtcblx0XHQvLyBpZiB0aGUgY29tcG9uZW50IHdhcyBkZXN0cm95ZWQgaW1tZWRpYXRlbHlcblx0XHQvLyBpdCB3aWxsIHVwZGF0ZSB0aGUgYCQkLm9uX2Rlc3Ryb3lgIHJlZmVyZW5jZSB0byBgbnVsbGAuXG5cdFx0Ly8gdGhlIGRlc3RydWN0dXJlZCBvbl9kZXN0cm95IG1heSBzdGlsbCByZWZlcmVuY2UgdG8gdGhlIG9sZCBhcnJheVxuXHRcdGlmIChjb21wb25lbnQuJCQub25fZGVzdHJveSkge1xuXHRcdFx0Y29tcG9uZW50LiQkLm9uX2Rlc3Ryb3kucHVzaCguLi5uZXdfb25fZGVzdHJveSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEVkZ2UgY2FzZSAtIGNvbXBvbmVudCB3YXMgZGVzdHJveWVkIGltbWVkaWF0ZWx5LFxuXHRcdFx0Ly8gbW9zdCBsaWtlbHkgYXMgYSByZXN1bHQgb2YgYSBiaW5kaW5nIGluaXRpYWxpc2luZ1xuXHRcdFx0cnVuX2FsbChuZXdfb25fZGVzdHJveSk7XG5cdFx0fVxuXHRcdGNvbXBvbmVudC4kJC5vbl9tb3VudCA9IFtdO1xuXHR9KTtcblx0YWZ0ZXJfdXBkYXRlLmZvckVhY2goYWRkX3JlbmRlcl9jYWxsYmFjayk7XG59XG5cbi8qKiBAcmV0dXJucyB7dm9pZH0gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXN0cm95X2NvbXBvbmVudChjb21wb25lbnQsIGRldGFjaGluZykge1xuXHRjb25zdCAkJCA9IGNvbXBvbmVudC4kJDtcblx0aWYgKCQkLmZyYWdtZW50ICE9PSBudWxsKSB7XG5cdFx0Zmx1c2hfcmVuZGVyX2NhbGxiYWNrcygkJC5hZnRlcl91cGRhdGUpO1xuXHRcdHJ1bl9hbGwoJCQub25fZGVzdHJveSk7XG5cdFx0JCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQuZChkZXRhY2hpbmcpO1xuXHRcdC8vIFRPRE8gbnVsbCBvdXQgb3RoZXIgcmVmcywgaW5jbHVkaW5nIGNvbXBvbmVudC4kJCAoYnV0IG5lZWQgdG9cblx0XHQvLyBwcmVzZXJ2ZSBmaW5hbCBzdGF0ZT8pXG5cdFx0JCQub25fZGVzdHJveSA9ICQkLmZyYWdtZW50ID0gbnVsbDtcblx0XHQkJC5jdHggPSBbXTtcblx0fVxufVxuXG4vKiogQHJldHVybnMge3ZvaWR9ICovXG5mdW5jdGlvbiBtYWtlX2RpcnR5KGNvbXBvbmVudCwgaSkge1xuXHRpZiAoY29tcG9uZW50LiQkLmRpcnR5WzBdID09PSAtMSkge1xuXHRcdGRpcnR5X2NvbXBvbmVudHMucHVzaChjb21wb25lbnQpO1xuXHRcdHNjaGVkdWxlX3VwZGF0ZSgpO1xuXHRcdGNvbXBvbmVudC4kJC5kaXJ0eS5maWxsKDApO1xuXHR9XG5cdGNvbXBvbmVudC4kJC5kaXJ0eVsoaSAvIDMxKSB8IDBdIHw9IDEgPDwgaSAlIDMxO1xufVxuXG4vLyBUT0RPOiBEb2N1bWVudCB0aGUgb3RoZXIgcGFyYW1zXG4vKipcbiAqIEBwYXJhbSB7U3ZlbHRlQ29tcG9uZW50fSBjb21wb25lbnRcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLkNvbXBvbmVudENvbnN0cnVjdG9yT3B0aW9uc30gb3B0aW9uc1xuICpcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3V0aWxzLmpzJylbJ25vdF9lcXVhbCddfSBub3RfZXF1YWwgVXNlZCB0byBjb21wYXJlIHByb3BzIGFuZCBzdGF0ZSB2YWx1ZXMuXG4gKiBAcGFyYW0geyh0YXJnZXQ6IEVsZW1lbnQgfCBTaGFkb3dSb290KSA9PiB2b2lkfSBbYXBwZW5kX3N0eWxlc10gRnVuY3Rpb24gdGhhdCBhcHBlbmRzIHN0eWxlcyB0byB0aGUgRE9NIHdoZW4gdGhlIGNvbXBvbmVudCBpcyBmaXJzdCBpbml0aWFsaXNlZC5cbiAqIFRoaXMgd2lsbCBiZSB0aGUgYGFkZF9jc3NgIGZ1bmN0aW9uIGZyb20gdGhlIGNvbXBpbGVkIGNvbXBvbmVudC5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXQoXG5cdGNvbXBvbmVudCxcblx0b3B0aW9ucyxcblx0aW5zdGFuY2UsXG5cdGNyZWF0ZV9mcmFnbWVudCxcblx0bm90X2VxdWFsLFxuXHRwcm9wcyxcblx0YXBwZW5kX3N0eWxlcyA9IG51bGwsXG5cdGRpcnR5ID0gWy0xXVxuKSB7XG5cdGNvbnN0IHBhcmVudF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcblx0c2V0X2N1cnJlbnRfY29tcG9uZW50KGNvbXBvbmVudCk7XG5cdC8qKiBAdHlwZSB7aW1wb3J0KCcuL3ByaXZhdGUuanMnKS5UJCR9ICovXG5cdGNvbnN0ICQkID0gKGNvbXBvbmVudC4kJCA9IHtcblx0XHRmcmFnbWVudDogbnVsbCxcblx0XHRjdHg6IFtdLFxuXHRcdC8vIHN0YXRlXG5cdFx0cHJvcHMsXG5cdFx0dXBkYXRlOiBub29wLFxuXHRcdG5vdF9lcXVhbCxcblx0XHRib3VuZDogYmxhbmtfb2JqZWN0KCksXG5cdFx0Ly8gbGlmZWN5Y2xlXG5cdFx0b25fbW91bnQ6IFtdLFxuXHRcdG9uX2Rlc3Ryb3k6IFtdLFxuXHRcdG9uX2Rpc2Nvbm5lY3Q6IFtdLFxuXHRcdGJlZm9yZV91cGRhdGU6IFtdLFxuXHRcdGFmdGVyX3VwZGF0ZTogW10sXG5cdFx0Y29udGV4dDogbmV3IE1hcChvcHRpb25zLmNvbnRleHQgfHwgKHBhcmVudF9jb21wb25lbnQgPyBwYXJlbnRfY29tcG9uZW50LiQkLmNvbnRleHQgOiBbXSkpLFxuXHRcdC8vIGV2ZXJ5dGhpbmcgZWxzZVxuXHRcdGNhbGxiYWNrczogYmxhbmtfb2JqZWN0KCksXG5cdFx0ZGlydHksXG5cdFx0c2tpcF9ib3VuZDogZmFsc2UsXG5cdFx0cm9vdDogb3B0aW9ucy50YXJnZXQgfHwgcGFyZW50X2NvbXBvbmVudC4kJC5yb290XG5cdH0pO1xuXHRhcHBlbmRfc3R5bGVzICYmIGFwcGVuZF9zdHlsZXMoJCQucm9vdCk7XG5cdGxldCByZWFkeSA9IGZhbHNlO1xuXHQkJC5jdHggPSBpbnN0YW5jZVxuXHRcdD8gaW5zdGFuY2UoY29tcG9uZW50LCBvcHRpb25zLnByb3BzIHx8IHt9LCAoaSwgcmV0LCAuLi5yZXN0KSA9PiB7XG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gcmVzdC5sZW5ndGggPyByZXN0WzBdIDogcmV0O1xuXHRcdFx0XHRpZiAoJCQuY3R4ICYmIG5vdF9lcXVhbCgkJC5jdHhbaV0sICgkJC5jdHhbaV0gPSB2YWx1ZSkpKSB7XG5cdFx0XHRcdFx0aWYgKCEkJC5za2lwX2JvdW5kICYmICQkLmJvdW5kW2ldKSAkJC5ib3VuZFtpXSh2YWx1ZSk7XG5cdFx0XHRcdFx0aWYgKHJlYWR5KSBtYWtlX2RpcnR5KGNvbXBvbmVudCwgaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHQgIH0pXG5cdFx0OiBbXTtcblx0JCQudXBkYXRlKCk7XG5cdHJlYWR5ID0gdHJ1ZTtcblx0cnVuX2FsbCgkJC5iZWZvcmVfdXBkYXRlKTtcblx0Ly8gYGZhbHNlYCBhcyBhIHNwZWNpYWwgY2FzZSBvZiBubyBET00gY29tcG9uZW50XG5cdCQkLmZyYWdtZW50ID0gY3JlYXRlX2ZyYWdtZW50ID8gY3JlYXRlX2ZyYWdtZW50KCQkLmN0eCkgOiBmYWxzZTtcblx0aWYgKG9wdGlvbnMudGFyZ2V0KSB7XG5cdFx0aWYgKG9wdGlvbnMuaHlkcmF0ZSkge1xuXHRcdFx0c3RhcnRfaHlkcmF0aW5nKCk7XG5cdFx0XHQvLyBUT0RPOiB3aGF0IGlzIHRoZSBjb3JyZWN0IHR5cGUgaGVyZT9cblx0XHRcdC8vIEB0cy1leHBlY3QtZXJyb3Jcblx0XHRcdGNvbnN0IG5vZGVzID0gY2hpbGRyZW4ob3B0aW9ucy50YXJnZXQpO1xuXHRcdFx0JCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQubChub2Rlcyk7XG5cdFx0XHRub2Rlcy5mb3JFYWNoKGRldGFjaCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG5cdFx0XHQkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5jKCk7XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLmludHJvKSB0cmFuc2l0aW9uX2luKGNvbXBvbmVudC4kJC5mcmFnbWVudCk7XG5cdFx0bW91bnRfY29tcG9uZW50KGNvbXBvbmVudCwgb3B0aW9ucy50YXJnZXQsIG9wdGlvbnMuYW5jaG9yKTtcblx0XHRlbmRfaHlkcmF0aW5nKCk7XG5cdFx0Zmx1c2goKTtcblx0fVxuXHRzZXRfY3VycmVudF9jb21wb25lbnQocGFyZW50X2NvbXBvbmVudCk7XG59XG5cbmV4cG9ydCBsZXQgU3ZlbHRlRWxlbWVudDtcblxuaWYgKHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRTdmVsdGVFbGVtZW50ID0gY2xhc3MgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cdFx0LyoqIFRoZSBTdmVsdGUgY29tcG9uZW50IGNvbnN0cnVjdG9yICovXG5cdFx0JCRjdG9yO1xuXHRcdC8qKiBTbG90cyAqL1xuXHRcdCQkcztcblx0XHQvKiogVGhlIFN2ZWx0ZSBjb21wb25lbnQgaW5zdGFuY2UgKi9cblx0XHQkJGM7XG5cdFx0LyoqIFdoZXRoZXIgb3Igbm90IHRoZSBjdXN0b20gZWxlbWVudCBpcyBjb25uZWN0ZWQgKi9cblx0XHQkJGNuID0gZmFsc2U7XG5cdFx0LyoqIENvbXBvbmVudCBwcm9wcyBkYXRhICovXG5cdFx0JCRkID0ge307XG5cdFx0LyoqIGB0cnVlYCBpZiBjdXJyZW50bHkgaW4gdGhlIHByb2Nlc3Mgb2YgcmVmbGVjdGluZyBjb21wb25lbnQgcHJvcHMgYmFjayB0byBhdHRyaWJ1dGVzICovXG5cdFx0JCRyID0gZmFsc2U7XG5cdFx0LyoqIEB0eXBlIHtSZWNvcmQ8c3RyaW5nLCBDdXN0b21FbGVtZW50UHJvcERlZmluaXRpb24+fSBQcm9wcyBkZWZpbml0aW9uIChuYW1lLCByZWZsZWN0ZWQsIHR5cGUgZXRjKSAqL1xuXHRcdCQkcF9kID0ge307XG5cdFx0LyoqIEB0eXBlIHtSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbltdPn0gRXZlbnQgbGlzdGVuZXJzICovXG5cdFx0JCRsID0ge307XG5cdFx0LyoqIEB0eXBlIHtNYXA8RnVuY3Rpb24sIEZ1bmN0aW9uPn0gRXZlbnQgbGlzdGVuZXIgdW5zdWJzY3JpYmUgZnVuY3Rpb25zICovXG5cdFx0JCRsX3UgPSBuZXcgTWFwKCk7XG5cblx0XHRjb25zdHJ1Y3RvcigkJGNvbXBvbmVudEN0b3IsICQkc2xvdHMsIHVzZV9zaGFkb3dfZG9tKSB7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpcy4kJGN0b3IgPSAkJGNvbXBvbmVudEN0b3I7XG5cdFx0XHR0aGlzLiQkcyA9ICQkc2xvdHM7XG5cdFx0XHRpZiAodXNlX3NoYWRvd19kb20pIHtcblx0XHRcdFx0dGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0YWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucykge1xuXHRcdFx0Ly8gV2UgY2FuJ3QgZGV0ZXJtaW5lIHVwZnJvbnQgaWYgdGhlIGV2ZW50IGlzIGEgY3VzdG9tIGV2ZW50IG9yIG5vdCwgc28gd2UgaGF2ZSB0b1xuXHRcdFx0Ly8gbGlzdGVuIHRvIGJvdGguIElmIHNvbWVvbmUgdXNlcyBhIGN1c3RvbSBldmVudCB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgYSByZWd1bGFyXG5cdFx0XHQvLyBicm93c2VyIGV2ZW50LCB0aGlzIGZpcmVzIHR3aWNlIC0gd2UgY2FuJ3QgYXZvaWQgdGhhdC5cblx0XHRcdHRoaXMuJCRsW3R5cGVdID0gdGhpcy4kJGxbdHlwZV0gfHwgW107XG5cdFx0XHR0aGlzLiQkbFt0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblx0XHRcdGlmICh0aGlzLiQkYykge1xuXHRcdFx0XHRjb25zdCB1bnN1YiA9IHRoaXMuJCRjLiRvbih0eXBlLCBsaXN0ZW5lcik7XG5cdFx0XHRcdHRoaXMuJCRsX3Uuc2V0KGxpc3RlbmVyLCB1bnN1Yik7XG5cdFx0XHR9XG5cdFx0XHRzdXBlci5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcblx0XHR9XG5cblx0XHRyZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKSB7XG5cdFx0XHRzdXBlci5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcblx0XHRcdGlmICh0aGlzLiQkYykge1xuXHRcdFx0XHRjb25zdCB1bnN1YiA9IHRoaXMuJCRsX3UuZ2V0KGxpc3RlbmVyKTtcblx0XHRcdFx0aWYgKHVuc3ViKSB7XG5cdFx0XHRcdFx0dW5zdWIoKTtcblx0XHRcdFx0XHR0aGlzLiQkbF91LmRlbGV0ZShsaXN0ZW5lcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRhc3luYyBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRcdHRoaXMuJCRjbiA9IHRydWU7XG5cdFx0XHRpZiAoIXRoaXMuJCRjKSB7XG5cdFx0XHRcdC8vIFdlIHdhaXQgb25lIHRpY2sgdG8gbGV0IHBvc3NpYmxlIGNoaWxkIHNsb3QgZWxlbWVudHMgYmUgY3JlYXRlZC9tb3VudGVkXG5cdFx0XHRcdGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdFx0XHRpZiAoIXRoaXMuJCRjbiB8fCB0aGlzLiQkYykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRmdW5jdGlvbiBjcmVhdGVfc2xvdChuYW1lKSB7XG5cdFx0XHRcdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdFx0XHRcdGxldCBub2RlO1xuXHRcdFx0XHRcdFx0Y29uc3Qgb2JqID0ge1xuXHRcdFx0XHRcdFx0XHRjOiBmdW5jdGlvbiBjcmVhdGUoKSB7XG5cdFx0XHRcdFx0XHRcdFx0bm9kZSA9IGVsZW1lbnQoJ3Nsb3QnKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAobmFtZSAhPT0gJ2RlZmF1bHQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhdHRyKG5vZGUsICduYW1lJywgbmFtZSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHRcdFx0ICogQHBhcmFtIHtIVE1MRWxlbWVudH0gdGFyZ2V0XG5cdFx0XHRcdFx0XHRcdCAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFthbmNob3JdXG5cdFx0XHRcdFx0XHRcdCAqL1xuXHRcdFx0XHRcdFx0XHRtOiBmdW5jdGlvbiBtb3VudCh0YXJnZXQsIGFuY2hvcikge1xuXHRcdFx0XHRcdFx0XHRcdGluc2VydCh0YXJnZXQsIG5vZGUsIGFuY2hvcik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGQ6IGZ1bmN0aW9uIGRlc3Ryb3koZGV0YWNoaW5nKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGRldGFjaGluZykge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGV0YWNoKG5vZGUpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJldHVybiBvYmo7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCAkJHNsb3RzID0ge307XG5cdFx0XHRcdGNvbnN0IGV4aXN0aW5nX3Nsb3RzID0gZ2V0X2N1c3RvbV9lbGVtZW50c19zbG90cyh0aGlzKTtcblx0XHRcdFx0Zm9yIChjb25zdCBuYW1lIG9mIHRoaXMuJCRzKSB7XG5cdFx0XHRcdFx0aWYgKG5hbWUgaW4gZXhpc3Rpbmdfc2xvdHMpIHtcblx0XHRcdFx0XHRcdCQkc2xvdHNbbmFtZV0gPSBbY3JlYXRlX3Nsb3QobmFtZSldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiB0aGlzLmF0dHJpYnV0ZXMpIHtcblx0XHRcdFx0XHQvLyB0aGlzLiQkZGF0YSB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhpcy5hdHRyaWJ1dGVzXG5cdFx0XHRcdFx0Y29uc3QgbmFtZSA9IHRoaXMuJCRnX3AoYXR0cmlidXRlLm5hbWUpO1xuXHRcdFx0XHRcdGlmICghKG5hbWUgaW4gdGhpcy4kJGQpKSB7XG5cdFx0XHRcdFx0XHR0aGlzLiQkZFtuYW1lXSA9IGdldF9jdXN0b21fZWxlbWVudF92YWx1ZShuYW1lLCBhdHRyaWJ1dGUudmFsdWUsIHRoaXMuJCRwX2QsICd0b1Byb3AnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gUG9ydCBvdmVyIHByb3BzIHRoYXQgd2VyZSBzZXQgcHJvZ3JhbW1hdGljYWxseSBiZWZvcmUgY2Ugd2FzIGluaXRpYWxpemVkXG5cdFx0XHRcdGZvciAoY29uc3Qga2V5IGluIHRoaXMuJCRwX2QpIHtcblx0XHRcdFx0XHRpZiAoIShrZXkgaW4gdGhpcy4kJGQpICYmIHRoaXNba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHR0aGlzLiQkZFtrZXldID0gdGhpc1trZXldOyAvLyBkb24ndCB0cmFuc2Zvcm0sIHRoZXNlIHdlcmUgc2V0IHRocm91Z2ggSmF2YVNjcmlwdFxuXHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXNba2V5XTsgLy8gcmVtb3ZlIHRoZSBwcm9wZXJ0eSB0aGF0IHNoYWRvd3MgdGhlIGdldHRlci9zZXR0ZXJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kJGMgPSBuZXcgdGhpcy4kJGN0b3Ioe1xuXHRcdFx0XHRcdHRhcmdldDogdGhpcy5zaGFkb3dSb290IHx8IHRoaXMsXG5cdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdC4uLnRoaXMuJCRkLFxuXHRcdFx0XHRcdFx0JCRzbG90cyxcblx0XHRcdFx0XHRcdCQkc2NvcGU6IHtcblx0XHRcdFx0XHRcdFx0Y3R4OiBbXVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gUmVmbGVjdCBjb21wb25lbnQgcHJvcHMgYXMgYXR0cmlidXRlc1xuXHRcdFx0XHRjb25zdCByZWZsZWN0X2F0dHJpYnV0ZXMgPSAoKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy4kJHIgPSB0cnVlO1xuXHRcdFx0XHRcdGZvciAoY29uc3Qga2V5IGluIHRoaXMuJCRwX2QpIHtcblx0XHRcdFx0XHRcdHRoaXMuJCRkW2tleV0gPSB0aGlzLiQkYy4kJC5jdHhbdGhpcy4kJGMuJCQucHJvcHNba2V5XV07XG5cdFx0XHRcdFx0XHRpZiAodGhpcy4kJHBfZFtrZXldLnJlZmxlY3QpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgYXR0cmlidXRlX3ZhbHVlID0gZ2V0X2N1c3RvbV9lbGVtZW50X3ZhbHVlKFxuXHRcdFx0XHRcdFx0XHRcdGtleSxcblx0XHRcdFx0XHRcdFx0XHR0aGlzLiQkZFtrZXldLFxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuJCRwX2QsXG5cdFx0XHRcdFx0XHRcdFx0J3RvQXR0cmlidXRlJ1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoYXR0cmlidXRlX3ZhbHVlID09IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLiQkcF9kW2tleV0uYXR0cmlidXRlIHx8IGtleSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUodGhpcy4kJHBfZFtrZXldLmF0dHJpYnV0ZSB8fCBrZXksIGF0dHJpYnV0ZV92YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy4kJHIgPSBmYWxzZTtcblx0XHRcdFx0fTtcblx0XHRcdFx0dGhpcy4kJGMuJCQuYWZ0ZXJfdXBkYXRlLnB1c2gocmVmbGVjdF9hdHRyaWJ1dGVzKTtcblx0XHRcdFx0cmVmbGVjdF9hdHRyaWJ1dGVzKCk7IC8vIG9uY2UgaW5pdGlhbGx5IGJlY2F1c2UgYWZ0ZXJfdXBkYXRlIGlzIGFkZGVkIHRvbyBsYXRlIGZvciBmaXJzdCByZW5kZXJcblxuXHRcdFx0XHRmb3IgKGNvbnN0IHR5cGUgaW4gdGhpcy4kJGwpIHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIHRoaXMuJCRsW3R5cGVdKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1bnN1YiA9IHRoaXMuJCRjLiRvbih0eXBlLCBsaXN0ZW5lcik7XG5cdFx0XHRcdFx0XHR0aGlzLiQkbF91LnNldChsaXN0ZW5lciwgdW5zdWIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLiQkbCA9IHt9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFdlIGRvbid0IG5lZWQgdGhpcyB3aGVuIHdvcmtpbmcgd2l0aGluIFN2ZWx0ZSBjb2RlLCBidXQgZm9yIGNvbXBhdGliaWxpdHkgb2YgcGVvcGxlIHVzaW5nIHRoaXMgb3V0c2lkZSBvZiBTdmVsdGVcblx0XHQvLyBhbmQgc2V0dGluZyBhdHRyaWJ1dGVzIHRocm91Z2ggc2V0QXR0cmlidXRlIGV0YywgdGhpcyBpcyBoZWxwZnVsXG5cdFx0YXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGF0dHIsIF9vbGRWYWx1ZSwgbmV3VmFsdWUpIHtcblx0XHRcdGlmICh0aGlzLiQkcikgcmV0dXJuO1xuXHRcdFx0YXR0ciA9IHRoaXMuJCRnX3AoYXR0cik7XG5cdFx0XHR0aGlzLiQkZFthdHRyXSA9IGdldF9jdXN0b21fZWxlbWVudF92YWx1ZShhdHRyLCBuZXdWYWx1ZSwgdGhpcy4kJHBfZCwgJ3RvUHJvcCcpO1xuXHRcdFx0dGhpcy4kJGM/LiRzZXQoeyBbYXR0cl06IHRoaXMuJCRkW2F0dHJdIH0pO1xuXHRcdH1cblxuXHRcdGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuXHRcdFx0dGhpcy4kJGNuID0gZmFsc2U7XG5cdFx0XHQvLyBJbiBhIG1pY3JvdGFzaywgYmVjYXVzZSB0aGlzIGNvdWxkIGJlIGEgbW92ZSB3aXRoaW4gdGhlIERPTVxuXHRcdFx0UHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdGlmICghdGhpcy4kJGNuKSB7XG5cdFx0XHRcdFx0dGhpcy4kJGMuJGRlc3Ryb3koKTtcblx0XHRcdFx0XHR0aGlzLiQkYyA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0JCRnX3AoYXR0cmlidXRlX25hbWUpIHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdE9iamVjdC5rZXlzKHRoaXMuJCRwX2QpLmZpbmQoXG5cdFx0XHRcdFx0KGtleSkgPT5cblx0XHRcdFx0XHRcdHRoaXMuJCRwX2Rba2V5XS5hdHRyaWJ1dGUgPT09IGF0dHJpYnV0ZV9uYW1lIHx8XG5cdFx0XHRcdFx0XHQoIXRoaXMuJCRwX2Rba2V5XS5hdHRyaWJ1dGUgJiYga2V5LnRvTG93ZXJDYXNlKCkgPT09IGF0dHJpYnV0ZV9uYW1lKVxuXHRcdFx0XHQpIHx8IGF0dHJpYnV0ZV9uYW1lXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gcHJvcFxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcGFyYW0ge1JlY29yZDxzdHJpbmcsIEN1c3RvbUVsZW1lbnRQcm9wRGVmaW5pdGlvbj59IHByb3BzX2RlZmluaXRpb25cbiAqIEBwYXJhbSB7J3RvQXR0cmlidXRlJyB8ICd0b1Byb3AnfSBbdHJhbnNmb3JtXVxuICovXG5mdW5jdGlvbiBnZXRfY3VzdG9tX2VsZW1lbnRfdmFsdWUocHJvcCwgdmFsdWUsIHByb3BzX2RlZmluaXRpb24sIHRyYW5zZm9ybSkge1xuXHRjb25zdCB0eXBlID0gcHJvcHNfZGVmaW5pdGlvbltwcm9wXT8udHlwZTtcblx0dmFsdWUgPSB0eXBlID09PSAnQm9vbGVhbicgJiYgdHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicgPyB2YWx1ZSAhPSBudWxsIDogdmFsdWU7XG5cdGlmICghdHJhbnNmb3JtIHx8ICFwcm9wc19kZWZpbml0aW9uW3Byb3BdKSB7XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9IGVsc2UgaWYgKHRyYW5zZm9ybSA9PT0gJ3RvQXR0cmlidXRlJykge1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnT2JqZWN0Jzpcblx0XHRcdGNhc2UgJ0FycmF5Jzpcblx0XHRcdFx0cmV0dXJuIHZhbHVlID09IG51bGwgPyBudWxsIDogSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuXHRcdFx0Y2FzZSAnQm9vbGVhbic6XG5cdFx0XHRcdHJldHVybiB2YWx1ZSA/ICcnIDogbnVsbDtcblx0XHRcdGNhc2UgJ051bWJlcic6XG5cdFx0XHRcdHJldHVybiB2YWx1ZSA9PSBudWxsID8gbnVsbCA6IHZhbHVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdGNhc2UgJ09iamVjdCc6XG5cdFx0XHRjYXNlICdBcnJheSc6XG5cdFx0XHRcdHJldHVybiB2YWx1ZSAmJiBKU09OLnBhcnNlKHZhbHVlKTtcblx0XHRcdGNhc2UgJ0Jvb2xlYW4nOlxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7IC8vIGNvbnZlcnNpb24gYWxyZWFkeSBoYW5kbGVkIGFib3ZlXG5cdFx0XHRjYXNlICdOdW1iZXInOlxuXHRcdFx0XHRyZXR1cm4gdmFsdWUgIT0gbnVsbCA/ICt2YWx1ZSA6IHZhbHVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICpcbiAqIFR1cm4gYSBTdmVsdGUgY29tcG9uZW50IGludG8gYSBjdXN0b20gZWxlbWVudC5cbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLkNvbXBvbmVudFR5cGV9IENvbXBvbmVudCAgQSBTdmVsdGUgY29tcG9uZW50IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge1JlY29yZDxzdHJpbmcsIEN1c3RvbUVsZW1lbnRQcm9wRGVmaW5pdGlvbj59IHByb3BzX2RlZmluaXRpb24gIFRoZSBwcm9wcyB0byBvYnNlcnZlXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBzbG90cyAgVGhlIHNsb3RzIHRvIGNyZWF0ZVxuICogQHBhcmFtIHtzdHJpbmdbXX0gYWNjZXNzb3JzICBPdGhlciBhY2Nlc3NvcnMgYmVzaWRlcyB0aGUgb25lcyBmb3IgcHJvcHMgdGhlIGNvbXBvbmVudCBoYXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gdXNlX3NoYWRvd19kb20gIFdoZXRoZXIgdG8gdXNlIHNoYWRvdyBET01cbiAqIEBwYXJhbSB7KGNlOiBuZXcgKCkgPT4gSFRNTEVsZW1lbnQpID0+IG5ldyAoKSA9PiBIVE1MRWxlbWVudH0gW2V4dGVuZF1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9jdXN0b21fZWxlbWVudChcblx0Q29tcG9uZW50LFxuXHRwcm9wc19kZWZpbml0aW9uLFxuXHRzbG90cyxcblx0YWNjZXNzb3JzLFxuXHR1c2Vfc2hhZG93X2RvbSxcblx0ZXh0ZW5kXG4pIHtcblx0bGV0IENsYXNzID0gY2xhc3MgZXh0ZW5kcyBTdmVsdGVFbGVtZW50IHtcblx0XHRjb25zdHJ1Y3RvcigpIHtcblx0XHRcdHN1cGVyKENvbXBvbmVudCwgc2xvdHMsIHVzZV9zaGFkb3dfZG9tKTtcblx0XHRcdHRoaXMuJCRwX2QgPSBwcm9wc19kZWZpbml0aW9uO1xuXHRcdH1cblx0XHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhwcm9wc19kZWZpbml0aW9uKS5tYXAoKGtleSkgPT5cblx0XHRcdFx0KHByb3BzX2RlZmluaXRpb25ba2V5XS5hdHRyaWJ1dGUgfHwga2V5KS50b0xvd2VyQ2FzZSgpXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcblx0T2JqZWN0LmtleXMocHJvcHNfZGVmaW5pdGlvbikuZm9yRWFjaCgocHJvcCkgPT4ge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuJCRjICYmIHByb3AgaW4gdGhpcy4kJGMgPyB0aGlzLiQkY1twcm9wXSA6IHRoaXMuJCRkW3Byb3BdO1xuXHRcdFx0fSxcblx0XHRcdHNldCh2YWx1ZSkge1xuXHRcdFx0XHR2YWx1ZSA9IGdldF9jdXN0b21fZWxlbWVudF92YWx1ZShwcm9wLCB2YWx1ZSwgcHJvcHNfZGVmaW5pdGlvbik7XG5cdFx0XHRcdHRoaXMuJCRkW3Byb3BdID0gdmFsdWU7XG5cdFx0XHRcdHRoaXMuJCRjPy4kc2V0KHsgW3Byb3BdOiB2YWx1ZSB9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cdGFjY2Vzc29ycy5mb3JFYWNoKChhY2Nlc3NvcikgPT4ge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGFzcy5wcm90b3R5cGUsIGFjY2Vzc29yLCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLiQkYz8uW2FjY2Vzc29yXTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cdGlmIChleHRlbmQpIHtcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yIC0gYXNzaWduaW5nIGhlcmUgaXMgZmluZVxuXHRcdENsYXNzID0gZXh0ZW5kKENsYXNzKTtcblx0fVxuXHRDb21wb25lbnQuZWxlbWVudCA9IC8qKiBAdHlwZSB7YW55fSAqLyAoQ2xhc3MpO1xuXHRyZXR1cm4gQ2xhc3M7XG59XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgU3ZlbHRlIGNvbXBvbmVudHMuIFVzZWQgd2hlbiBkZXY9ZmFsc2UuXG4gKlxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbUHJvcHM9YW55XVxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRzPWFueV1cbiAqL1xuZXhwb3J0IGNsYXNzIFN2ZWx0ZUNvbXBvbmVudCB7XG5cdC8qKlxuXHQgKiAjIyMgUFJJVkFURSBBUElcblx0ICpcblx0ICogRG8gbm90IHVzZSwgbWF5IGNoYW5nZSBhdCBhbnkgdGltZVxuXHQgKlxuXHQgKiBAdHlwZSB7YW55fVxuXHQgKi9cblx0JCQgPSB1bmRlZmluZWQ7XG5cdC8qKlxuXHQgKiAjIyMgUFJJVkFURSBBUElcblx0ICpcblx0ICogRG8gbm90IHVzZSwgbWF5IGNoYW5nZSBhdCBhbnkgdGltZVxuXHQgKlxuXHQgKiBAdHlwZSB7YW55fVxuXHQgKi9cblx0JCRzZXQgPSB1bmRlZmluZWQ7XG5cblx0LyoqIEByZXR1cm5zIHt2b2lkfSAqL1xuXHQkZGVzdHJveSgpIHtcblx0XHRkZXN0cm95X2NvbXBvbmVudCh0aGlzLCAxKTtcblx0XHR0aGlzLiRkZXN0cm95ID0gbm9vcDtcblx0fVxuXG5cdC8qKlxuXHQgKiBAdGVtcGxhdGUge0V4dHJhY3Q8a2V5b2YgRXZlbnRzLCBzdHJpbmc+fSBLXG5cdCAqIEBwYXJhbSB7S30gdHlwZVxuXHQgKiBAcGFyYW0geygoZTogRXZlbnRzW0tdKSA9PiB2b2lkKSB8IG51bGwgfCB1bmRlZmluZWR9IGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHsoKSA9PiB2b2lkfVxuXHQgKi9cblx0JG9uKHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKCFpc19mdW5jdGlvbihjYWxsYmFjaykpIHtcblx0XHRcdHJldHVybiBub29wO1xuXHRcdH1cblx0XHRjb25zdCBjYWxsYmFja3MgPSB0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSB8fCAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gPSBbXSk7XG5cdFx0Y2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXHRcdHJldHVybiAoKSA9PiB7XG5cdFx0XHRjb25zdCBpbmRleCA9IGNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKTtcblx0XHRcdGlmIChpbmRleCAhPT0gLTEpIGNhbGxiYWNrcy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdH07XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtQYXJ0aWFsPFByb3BzPn0gcHJvcHNcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHQkc2V0KHByb3BzKSB7XG5cdFx0aWYgKHRoaXMuJCRzZXQgJiYgIWlzX2VtcHR5KHByb3BzKSkge1xuXHRcdFx0dGhpcy4kJC5za2lwX2JvdW5kID0gdHJ1ZTtcblx0XHRcdHRoaXMuJCRzZXQocHJvcHMpO1xuXHRcdFx0dGhpcy4kJC5za2lwX2JvdW5kID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gQ3VzdG9tRWxlbWVudFByb3BEZWZpbml0aW9uXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2F0dHJpYnV0ZV1cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW3JlZmxlY3RdXG4gKiBAcHJvcGVydHkgeydTdHJpbmcnfCdCb29sZWFuJ3wnTnVtYmVyJ3wnQXJyYXknfCdPYmplY3QnfSBbdHlwZV1cbiAqL1xuIiwiLy8gZ2VuZXJhdGVkIGR1cmluZyByZWxlYXNlLCBkbyBub3QgbW9kaWZ5XG5cbi8qKlxuICogVGhlIGN1cnJlbnQgdmVyc2lvbiwgYXMgc2V0IGluIHBhY2thZ2UuanNvbi5cbiAqXG4gKiBodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUtY29tcGlsZXIjc3ZlbHRlLXZlcnNpb25cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBjb25zdCBWRVJTSU9OID0gJzQuMi4xMyc7XG5leHBvcnQgY29uc3QgUFVCTElDX1ZFUlNJT04gPSAnNCc7XG4iLCJpbXBvcnQgeyBQVUJMSUNfVkVSU0lPTiB9IGZyb20gJy4uLy4uLy4uL3NoYXJlZC92ZXJzaW9uLmpzJztcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXHQvLyBAdHMtaWdub3JlXG5cdCh3aW5kb3cuX19zdmVsdGUgfHwgKHdpbmRvdy5fX3N2ZWx0ZSA9IHsgdjogbmV3IFNldCgpIH0pKS52LmFkZChQVUJMSUNfVkVSU0lPTik7XG4iLCJ2YXIgZT1bXSx0PVtdO2Z1bmN0aW9uIG4obixyKXtpZihuJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgZG9jdW1lbnQpe3ZhciBhLHM9ITA9PT1yLnByZXBlbmQ/XCJwcmVwZW5kXCI6XCJhcHBlbmRcIixkPSEwPT09ci5zaW5nbGVUYWcsaT1cInN0cmluZ1wiPT10eXBlb2Ygci5jb250YWluZXI/ZG9jdW1lbnQucXVlcnlTZWxlY3RvcihyLmNvbnRhaW5lcik6ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdO2lmKGQpe3ZhciB1PWUuaW5kZXhPZihpKTstMT09PXUmJih1PWUucHVzaChpKS0xLHRbdV09e30pLGE9dFt1XSYmdFt1XVtzXT90W3VdW3NdOnRbdV1bc109YygpfWVsc2UgYT1jKCk7NjUyNzk9PT1uLmNoYXJDb2RlQXQoMCkmJihuPW4uc3Vic3RyaW5nKDEpKSxhLnN0eWxlU2hlZXQ/YS5zdHlsZVNoZWV0LmNzc1RleHQrPW46YS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShuKSl9ZnVuY3Rpb24gYygpe3ZhciBlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtpZihlLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpLHIuYXR0cmlidXRlcylmb3IodmFyIHQ9T2JqZWN0LmtleXMoci5hdHRyaWJ1dGVzKSxuPTA7bjx0Lmxlbmd0aDtuKyspZS5zZXRBdHRyaWJ1dGUodFtuXSxyLmF0dHJpYnV0ZXNbdFtuXV0pO3ZhciBhPVwicHJlcGVuZFwiPT09cz9cImFmdGVyYmVnaW5cIjpcImJlZm9yZWVuZFwiO3JldHVybiBpLmluc2VydEFkamFjZW50RWxlbWVudChhLGUpLGV9fWV4cG9ydHtuIGFzIGRlZmF1bHR9O1xuIiwiJ3VzZSBzdHJpY3QnO3ZhciBnPWd8fHt9O2cuc2NvcGU9e307Zy5hcnJheUl0ZXJhdG9ySW1wbD1mdW5jdGlvbihlKXt2YXIgaD0wO3JldHVybiBmdW5jdGlvbigpe3JldHVybiBoPGUubGVuZ3RoP3tkb25lOiExLHZhbHVlOmVbaCsrXX06e2RvbmU6ITB9fX07Zy5hcnJheUl0ZXJhdG9yPWZ1bmN0aW9uKGUpe3JldHVybntuZXh0OmcuYXJyYXlJdGVyYXRvckltcGwoZSl9fTtnLkFTU1VNRV9FUzU9ITE7Zy5BU1NVTUVfTk9fTkFUSVZFX01BUD0hMTtnLkFTU1VNRV9OT19OQVRJVkVfU0VUPSExO2cuU0lNUExFX0ZST1VORF9QT0xZRklMTD0hMTtnLklTT0xBVEVfUE9MWUZJTExTPSExO2cuRk9SQ0VfUE9MWUZJTExfUFJPTUlTRT0hMTtnLkZPUkNFX1BPTFlGSUxMX1BST01JU0VfV0hFTl9OT19VTkhBTkRMRURfUkVKRUNUSU9OPSExO1xuZy5kZWZpbmVQcm9wZXJ0eT1nLkFTU1VNRV9FUzV8fFwiZnVuY3Rpb25cIj09dHlwZW9mIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzP09iamVjdC5kZWZpbmVQcm9wZXJ0eTpmdW5jdGlvbihlLGgsbSl7aWYoZT09QXJyYXkucHJvdG90eXBlfHxlPT1PYmplY3QucHJvdG90eXBlKXJldHVybiBlO2VbaF09bS52YWx1ZTtyZXR1cm4gZX07Zy5nZXRHbG9iYWw9ZnVuY3Rpb24oZSl7ZT1bXCJvYmplY3RcIj09dHlwZW9mIGdsb2JhbFRoaXMmJmdsb2JhbFRoaXMsZSxcIm9iamVjdFwiPT10eXBlb2Ygd2luZG93JiZ3aW5kb3csXCJvYmplY3RcIj09dHlwZW9mIHNlbGYmJnNlbGYsXCJvYmplY3RcIj09dHlwZW9mIGdsb2JhbCYmZ2xvYmFsXTtmb3IodmFyIGg9MDtoPGUubGVuZ3RoOysraCl7dmFyIG09ZVtoXTtpZihtJiZtLk1hdGg9PU1hdGgpcmV0dXJuIG19dGhyb3cgRXJyb3IoXCJDYW5ub3QgZmluZCBnbG9iYWwgb2JqZWN0XCIpO307Zy5nbG9iYWw9Zy5nZXRHbG9iYWwodGhpcyk7XG5nLklTX1NZTUJPTF9OQVRJVkU9XCJmdW5jdGlvblwiPT09dHlwZW9mIFN5bWJvbCYmXCJzeW1ib2xcIj09PXR5cGVvZiBTeW1ib2woXCJ4XCIpO2cuVFJVU1RfRVM2X1BPTFlGSUxMUz0hZy5JU09MQVRFX1BPTFlGSUxMU3x8Zy5JU19TWU1CT0xfTkFUSVZFO2cucG9seWZpbGxzPXt9O2cucHJvcGVydHlUb1BvbHlmaWxsU3ltYm9sPXt9O2cuUE9MWUZJTExfUFJFRklYPVwiJGpzY3AkXCI7Zy5wb2x5ZmlsbD1mdW5jdGlvbihlLGgsbSxuKXtoJiYoZy5JU09MQVRFX1BPTFlGSUxMUz9nLnBvbHlmaWxsSXNvbGF0ZWQoZSxoLG0sbik6Zy5wb2x5ZmlsbFVuaXNvbGF0ZWQoZSxoLG0sbikpfTtcbmcucG9seWZpbGxVbmlzb2xhdGVkPWZ1bmN0aW9uKGUsaCl7dmFyIG09Zy5nbG9iYWw7ZT1lLnNwbGl0KFwiLlwiKTtmb3IodmFyIG49MDtuPGUubGVuZ3RoLTE7bisrKXt2YXIgdD1lW25dO2lmKCEodCBpbiBtKSlyZXR1cm47bT1tW3RdfWU9ZVtlLmxlbmd0aC0xXTtuPW1bZV07aD1oKG4pO2ghPW4mJm51bGwhPWgmJmcuZGVmaW5lUHJvcGVydHkobSxlLHtjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITAsdmFsdWU6aH0pfTtcbmcucG9seWZpbGxJc29sYXRlZD1mdW5jdGlvbihlLGgsbSl7dmFyIG49ZS5zcGxpdChcIi5cIik7ZT0xPT09bi5sZW5ndGg7dmFyIHQ9blswXTt0PSFlJiZ0IGluIGcucG9seWZpbGxzP2cucG9seWZpbGxzOmcuZ2xvYmFsO2Zvcih2YXIgdz0wO3c8bi5sZW5ndGgtMTt3Kyspe3ZhciB4PW5bd107aWYoISh4IGluIHQpKXJldHVybjt0PXRbeF19bj1uW24ubGVuZ3RoLTFdO209Zy5JU19TWU1CT0xfTkFUSVZFJiZcImVzNlwiPT09bT90W25dOm51bGw7aD1oKG0pO251bGwhPWgmJihlP2cuZGVmaW5lUHJvcGVydHkoZy5wb2x5ZmlsbHMsbix7Y29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOmh9KTpoIT09bSYmKHZvaWQgMD09PWcucHJvcGVydHlUb1BvbHlmaWxsU3ltYm9sW25dJiYoZT0xRTkqTWF0aC5yYW5kb20oKT4+PjAsZy5wcm9wZXJ0eVRvUG9seWZpbGxTeW1ib2xbbl09Zy5JU19TWU1CT0xfTkFUSVZFP2cuZ2xvYmFsLlN5bWJvbChuKTpnLlBPTFlGSUxMX1BSRUZJWCtlK1wiJFwiK1xubiksZy5kZWZpbmVQcm9wZXJ0eSh0LGcucHJvcGVydHlUb1BvbHlmaWxsU3ltYm9sW25dLHtjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITAsdmFsdWU6aH0pKSl9O2cuaW5pdFN5bWJvbD1mdW5jdGlvbigpe307XG5nLnBvbHlmaWxsKFwiU3ltYm9sXCIsZnVuY3Rpb24oZSl7ZnVuY3Rpb24gaCh3KXtpZih0aGlzIGluc3RhbmNlb2YgaCl0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sIGlzIG5vdCBhIGNvbnN0cnVjdG9yXCIpO3JldHVybiBuZXcgbShuKyh3fHxcIlwiKStcIl9cIit0Kyssdyl9ZnVuY3Rpb24gbSh3LHgpe3RoaXMuJGpzY29tcCRzeW1ib2wkaWRfPXc7Zy5kZWZpbmVQcm9wZXJ0eSh0aGlzLFwiZGVzY3JpcHRpb25cIix7Y29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOnh9KX1pZihlKXJldHVybiBlO20ucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuJGpzY29tcCRzeW1ib2wkaWRffTt2YXIgbj1cImpzY29tcF9zeW1ib2xfXCIrKDFFOSpNYXRoLnJhbmRvbSgpPj4+MCkrXCJfXCIsdD0wO3JldHVybiBofSxcImVzNlwiLFwiZXMzXCIpO1xuZy5wb2x5ZmlsbChcIlN5bWJvbC5pdGVyYXRvclwiLGZ1bmN0aW9uKGUpe2lmKGUpcmV0dXJuIGU7ZT1TeW1ib2woXCJTeW1ib2wuaXRlcmF0b3JcIik7Zm9yKHZhciBoPVwiQXJyYXkgSW50OEFycmF5IFVpbnQ4QXJyYXkgVWludDhDbGFtcGVkQXJyYXkgSW50MTZBcnJheSBVaW50MTZBcnJheSBJbnQzMkFycmF5IFVpbnQzMkFycmF5IEZsb2F0MzJBcnJheSBGbG9hdDY0QXJyYXlcIi5zcGxpdChcIiBcIiksbT0wO208aC5sZW5ndGg7bSsrKXt2YXIgbj1nLmdsb2JhbFtoW21dXTtcImZ1bmN0aW9uXCI9PT10eXBlb2YgbiYmXCJmdW5jdGlvblwiIT10eXBlb2Ygbi5wcm90b3R5cGVbZV0mJmcuZGVmaW5lUHJvcGVydHkobi5wcm90b3R5cGUsZSx7Y29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOmZ1bmN0aW9uKCl7cmV0dXJuIGcuaXRlcmF0b3JQcm90b3R5cGUoZy5hcnJheUl0ZXJhdG9ySW1wbCh0aGlzKSl9fSl9cmV0dXJuIGV9LFwiZXM2XCIsXCJlczNcIik7XG5nLml0ZXJhdG9yUHJvdG90eXBlPWZ1bmN0aW9uKGUpe2U9e25leHQ6ZX07ZVtTeW1ib2wuaXRlcmF0b3JdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9O3JldHVybiBlfTtnLml0ZXJhdG9yRnJvbUFycmF5PWZ1bmN0aW9uKGUsaCl7ZSBpbnN0YW5jZW9mIFN0cmluZyYmKGUrPVwiXCIpO3ZhciBtPTAsbj0hMSx0PXtuZXh0OmZ1bmN0aW9uKCl7aWYoIW4mJm08ZS5sZW5ndGgpe3ZhciB3PW0rKztyZXR1cm57dmFsdWU6aCh3LGVbd10pLGRvbmU6ITF9fW49ITA7cmV0dXJue2RvbmU6ITAsdmFsdWU6dm9pZCAwfX19O3RbU3ltYm9sLml0ZXJhdG9yXT1mdW5jdGlvbigpe3JldHVybiB0fTtyZXR1cm4gdH07Zy5wb2x5ZmlsbChcIkFycmF5LnByb3RvdHlwZS5rZXlzXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbigpe3JldHVybiBnLml0ZXJhdG9yRnJvbUFycmF5KHRoaXMsZnVuY3Rpb24oaCl7cmV0dXJuIGh9KX19LFwiZXM2XCIsXCJlczNcIik7XG5nLnBvbHlmaWxsKFwiQXJyYXkucHJvdG90eXBlLnZhbHVlc1wiLGZ1bmN0aW9uKGUpe3JldHVybiBlP2U6ZnVuY3Rpb24oKXtyZXR1cm4gZy5pdGVyYXRvckZyb21BcnJheSh0aGlzLGZ1bmN0aW9uKGgsbSl7cmV0dXJuIG19KX19LFwiZXM4XCIsXCJlczNcIik7Zy5jaGVja1N0cmluZ0FyZ3M9ZnVuY3Rpb24oZSxoLG0pe2lmKG51bGw9PWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIlRoZSAndGhpcycgdmFsdWUgZm9yIFN0cmluZy5wcm90b3R5cGUuXCIrbStcIiBtdXN0IG5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZFwiKTtpZihoIGluc3RhbmNlb2YgUmVnRXhwKXRocm93IG5ldyBUeXBlRXJyb3IoXCJGaXJzdCBhcmd1bWVudCB0byBTdHJpbmcucHJvdG90eXBlLlwiK20rXCIgbXVzdCBub3QgYmUgYSByZWd1bGFyIGV4cHJlc3Npb25cIik7cmV0dXJuIGUrXCJcIn07XG5nLnBvbHlmaWxsKFwiU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbihoLG0pe3ZhciBuPWcuY2hlY2tTdHJpbmdBcmdzKHRoaXMsaCxcInN0YXJ0c1dpdGhcIik7aCs9XCJcIjt2YXIgdD1uLmxlbmd0aCx3PWgubGVuZ3RoO209TWF0aC5tYXgoMCxNYXRoLm1pbihtfDAsbi5sZW5ndGgpKTtmb3IodmFyIHg9MDt4PHcmJm08dDspaWYoblttKytdIT1oW3grK10pcmV0dXJuITE7cmV0dXJuIHg+PXd9fSxcImVzNlwiLFwiZXMzXCIpO2cub3ducz1mdW5jdGlvbihlLGgpe3JldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZSxoKX07XG5nLmFzc2lnbj1nLlRSVVNUX0VTNl9QT0xZRklMTFMmJlwiZnVuY3Rpb25cIj09dHlwZW9mIE9iamVjdC5hc3NpZ24/T2JqZWN0LmFzc2lnbjpmdW5jdGlvbihlLGgpe2Zvcih2YXIgbT0xO208YXJndW1lbnRzLmxlbmd0aDttKyspe3ZhciBuPWFyZ3VtZW50c1ttXTtpZihuKWZvcih2YXIgdCBpbiBuKWcub3ducyhuLHQpJiYoZVt0XT1uW3RdKX1yZXR1cm4gZX07Zy5wb2x5ZmlsbChcIk9iamVjdC5hc3NpZ25cIixmdW5jdGlvbihlKXtyZXR1cm4gZXx8Zy5hc3NpZ259LFwiZXM2XCIsXCJlczNcIik7Zy5jaGVja0VzNkNvbmZvcm1hbmNlVmlhUHJveHk9ZnVuY3Rpb24oKXt0cnl7dmFyIGU9e30saD1PYmplY3QuY3JlYXRlKG5ldyBnLmdsb2JhbC5Qcm94eShlLHtnZXQ6ZnVuY3Rpb24obSxuLHQpe3JldHVybiBtPT1lJiZcInFcIj09biYmdD09aH19KSk7cmV0dXJuITA9PT1oLnF9Y2F0Y2gobSl7cmV0dXJuITF9fTtnLlVTRV9QUk9YWV9GT1JfRVM2X0NPTkZPUk1BTkNFX0NIRUNLUz0hMTtcbmcuRVM2X0NPTkZPUk1BTkNFPWcuVVNFX1BST1hZX0ZPUl9FUzZfQ09ORk9STUFOQ0VfQ0hFQ0tTJiZnLmNoZWNrRXM2Q29uZm9ybWFuY2VWaWFQcm94eSgpO2cubWFrZUl0ZXJhdG9yPWZ1bmN0aW9uKGUpe3ZhciBoPVwidW5kZWZpbmVkXCIhPXR5cGVvZiBTeW1ib2wmJlN5bWJvbC5pdGVyYXRvciYmZVtTeW1ib2wuaXRlcmF0b3JdO3JldHVybiBoP2guY2FsbChlKTpnLmFycmF5SXRlcmF0b3IoZSl9O1xuZy5wb2x5ZmlsbChcIldlYWtNYXBcIixmdW5jdGlvbihlKXtmdW5jdGlvbiBoKGwpe3RoaXMuaWRfPShwKz1NYXRoLnJhbmRvbSgpKzEpLnRvU3RyaW5nKCk7aWYobCl7bD1nLm1ha2VJdGVyYXRvcihsKTtmb3IodmFyIHE7IShxPWwubmV4dCgpKS5kb25lOylxPXEudmFsdWUsdGhpcy5zZXQocVswXSxxWzFdKX19ZnVuY3Rpb24gbSgpe2lmKCFlfHwhT2JqZWN0LnNlYWwpcmV0dXJuITE7dHJ5e3ZhciBsPU9iamVjdC5zZWFsKHt9KSxxPU9iamVjdC5zZWFsKHt9KSx2PW5ldyBlKFtbbCwyXSxbcSwzXV0pO2lmKDIhPXYuZ2V0KGwpfHwzIT12LmdldChxKSlyZXR1cm4hMTt2LmRlbGV0ZShsKTt2LnNldChxLDQpO3JldHVybiF2LmhhcyhsKSYmND09di5nZXQocSl9Y2F0Y2goQil7cmV0dXJuITF9fWZ1bmN0aW9uIG4oKXt9ZnVuY3Rpb24gdChsKXt2YXIgcT10eXBlb2YgbDtyZXR1cm5cIm9iamVjdFwiPT09cSYmbnVsbCE9PWx8fFwiZnVuY3Rpb25cIj09PXF9ZnVuY3Rpb24gdyhsKXtpZighZy5vd25zKGwsXG55KSl7dmFyIHE9bmV3IG47Zy5kZWZpbmVQcm9wZXJ0eShsLHkse3ZhbHVlOnF9KX19ZnVuY3Rpb24geChsKXtpZighZy5JU09MQVRFX1BPTFlGSUxMUyl7dmFyIHE9T2JqZWN0W2xdO3EmJihPYmplY3RbbF09ZnVuY3Rpb24odil7aWYodiBpbnN0YW5jZW9mIG4pcmV0dXJuIHY7T2JqZWN0LmlzRXh0ZW5zaWJsZSh2KSYmdyh2KTtyZXR1cm4gcSh2KX0pfX1pZihnLlVTRV9QUk9YWV9GT1JfRVM2X0NPTkZPUk1BTkNFX0NIRUNLUyl7aWYoZSYmZy5FUzZfQ09ORk9STUFOQ0UpcmV0dXJuIGV9ZWxzZSBpZihtKCkpcmV0dXJuIGU7dmFyIHk9XCIkanNjb21wX2hpZGRlbl9cIitNYXRoLnJhbmRvbSgpO3goXCJmcmVlemVcIik7eChcInByZXZlbnRFeHRlbnNpb25zXCIpO3goXCJzZWFsXCIpO3ZhciBwPTA7aC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKGwscSl7aWYoIXQobCkpdGhyb3cgRXJyb3IoXCJJbnZhbGlkIFdlYWtNYXAga2V5XCIpO3cobCk7aWYoIWcub3ducyhsLHkpKXRocm93IEVycm9yKFwiV2Vha01hcCBrZXkgZmFpbDogXCIrXG5sKTtsW3ldW3RoaXMuaWRfXT1xO3JldHVybiB0aGlzfTtoLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24obCl7cmV0dXJuIHQobCkmJmcub3ducyhsLHkpP2xbeV1bdGhpcy5pZF9dOnZvaWQgMH07aC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKGwpe3JldHVybiB0KGwpJiZnLm93bnMobCx5KSYmZy5vd25zKGxbeV0sdGhpcy5pZF8pfTtoLnByb3RvdHlwZS5kZWxldGU9ZnVuY3Rpb24obCl7cmV0dXJuIHQobCkmJmcub3ducyhsLHkpJiZnLm93bnMobFt5XSx0aGlzLmlkXyk/ZGVsZXRlIGxbeV1bdGhpcy5pZF9dOiExfTtyZXR1cm4gaH0sXCJlczZcIixcImVzM1wiKTtnLk1hcEVudHJ5PWZ1bmN0aW9uKCl7fTtcbmcucG9seWZpbGwoXCJNYXBcIixmdW5jdGlvbihlKXtmdW5jdGlvbiBoKCl7dmFyIHA9e307cmV0dXJuIHAucHJldmlvdXM9cC5uZXh0PXAuaGVhZD1wfWZ1bmN0aW9uIG0ocCxsKXt2YXIgcT1wLmhlYWRfO3JldHVybiBnLml0ZXJhdG9yUHJvdG90eXBlKGZ1bmN0aW9uKCl7aWYocSl7Zm9yKDtxLmhlYWQhPXAuaGVhZF87KXE9cS5wcmV2aW91cztmb3IoO3EubmV4dCE9cS5oZWFkOylyZXR1cm4gcT1xLm5leHQse2RvbmU6ITEsdmFsdWU6bChxKX07cT1udWxsfXJldHVybntkb25lOiEwLHZhbHVlOnZvaWQgMH19KX1mdW5jdGlvbiBuKHAsbCl7dmFyIHE9bCYmdHlwZW9mIGw7XCJvYmplY3RcIj09cXx8XCJmdW5jdGlvblwiPT1xP3guaGFzKGwpP3E9eC5nZXQobCk6KHE9XCJcIisgKyt5LHguc2V0KGwscSkpOnE9XCJwX1wiK2w7dmFyIHY9cC5kYXRhX1txXTtpZih2JiZnLm93bnMocC5kYXRhXyxxKSlmb3IocD0wO3A8di5sZW5ndGg7cCsrKXt2YXIgQj12W3BdO2lmKGwhPT1sJiZCLmtleSE9PUIua2V5fHxcbmw9PT1CLmtleSlyZXR1cm57aWQ6cSxsaXN0OnYsaW5kZXg6cCxlbnRyeTpCfX1yZXR1cm57aWQ6cSxsaXN0OnYsaW5kZXg6LTEsZW50cnk6dm9pZCAwfX1mdW5jdGlvbiB0KHApe3RoaXMuZGF0YV89e307dGhpcy5oZWFkXz1oKCk7dGhpcy5zaXplPTA7aWYocCl7cD1nLm1ha2VJdGVyYXRvcihwKTtmb3IodmFyIGw7IShsPXAubmV4dCgpKS5kb25lOylsPWwudmFsdWUsdGhpcy5zZXQobFswXSxsWzFdKX19ZnVuY3Rpb24gdygpe2lmKGcuQVNTVU1FX05PX05BVElWRV9NQVB8fCFlfHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBlfHwhZS5wcm90b3R5cGUuZW50cmllc3x8XCJmdW5jdGlvblwiIT10eXBlb2YgT2JqZWN0LnNlYWwpcmV0dXJuITE7dHJ5e3ZhciBwPU9iamVjdC5zZWFsKHt4OjR9KSxsPW5ldyBlKGcubWFrZUl0ZXJhdG9yKFtbcCxcInNcIl1dKSk7aWYoXCJzXCIhPWwuZ2V0KHApfHwxIT1sLnNpemV8fGwuZ2V0KHt4OjR9KXx8bC5zZXQoe3g6NH0sXCJ0XCIpIT1sfHwyIT1sLnNpemUpcmV0dXJuITE7XG52YXIgcT1sLmVudHJpZXMoKSx2PXEubmV4dCgpO2lmKHYuZG9uZXx8di52YWx1ZVswXSE9cHx8XCJzXCIhPXYudmFsdWVbMV0pcmV0dXJuITE7dj1xLm5leHQoKTtyZXR1cm4gdi5kb25lfHw0IT12LnZhbHVlWzBdLnh8fFwidFwiIT12LnZhbHVlWzFdfHwhcS5uZXh0KCkuZG9uZT8hMTohMH1jYXRjaChCKXtyZXR1cm4hMX19aWYoZy5VU0VfUFJPWFlfRk9SX0VTNl9DT05GT1JNQU5DRV9DSEVDS1Mpe2lmKGUmJmcuRVM2X0NPTkZPUk1BTkNFKXJldHVybiBlfWVsc2UgaWYodygpKXJldHVybiBlO3ZhciB4PW5ldyBXZWFrTWFwO3QucHJvdG90eXBlLnNldD1mdW5jdGlvbihwLGwpe3A9MD09PXA/MDpwO3ZhciBxPW4odGhpcyxwKTtxLmxpc3R8fChxLmxpc3Q9dGhpcy5kYXRhX1txLmlkXT1bXSk7cS5lbnRyeT9xLmVudHJ5LnZhbHVlPWw6KHEuZW50cnk9e25leHQ6dGhpcy5oZWFkXyxwcmV2aW91czp0aGlzLmhlYWRfLnByZXZpb3VzLGhlYWQ6dGhpcy5oZWFkXyxrZXk6cCx2YWx1ZTpsfSxxLmxpc3QucHVzaChxLmVudHJ5KSxcbnRoaXMuaGVhZF8ucHJldmlvdXMubmV4dD1xLmVudHJ5LHRoaXMuaGVhZF8ucHJldmlvdXM9cS5lbnRyeSx0aGlzLnNpemUrKyk7cmV0dXJuIHRoaXN9O3QucHJvdG90eXBlLmRlbGV0ZT1mdW5jdGlvbihwKXtwPW4odGhpcyxwKTtyZXR1cm4gcC5lbnRyeSYmcC5saXN0PyhwLmxpc3Quc3BsaWNlKHAuaW5kZXgsMSkscC5saXN0Lmxlbmd0aHx8ZGVsZXRlIHRoaXMuZGF0YV9bcC5pZF0scC5lbnRyeS5wcmV2aW91cy5uZXh0PXAuZW50cnkubmV4dCxwLmVudHJ5Lm5leHQucHJldmlvdXM9cC5lbnRyeS5wcmV2aW91cyxwLmVudHJ5LmhlYWQ9bnVsbCx0aGlzLnNpemUtLSwhMCk6ITF9O3QucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy5kYXRhXz17fTt0aGlzLmhlYWRfPXRoaXMuaGVhZF8ucHJldmlvdXM9aCgpO3RoaXMuc2l6ZT0wfTt0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24ocCl7cmV0dXJuISFuKHRoaXMscCkuZW50cnl9O3QucHJvdG90eXBlLmdldD1mdW5jdGlvbihwKXtyZXR1cm4ocD1cbm4odGhpcyxwKS5lbnRyeSkmJnAudmFsdWV9O3QucHJvdG90eXBlLmVudHJpZXM9ZnVuY3Rpb24oKXtyZXR1cm4gbSh0aGlzLGZ1bmN0aW9uKHApe3JldHVybltwLmtleSxwLnZhbHVlXX0pfTt0LnByb3RvdHlwZS5rZXlzPWZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyxmdW5jdGlvbihwKXtyZXR1cm4gcC5rZXl9KX07dC5wcm90b3R5cGUudmFsdWVzPWZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyxmdW5jdGlvbihwKXtyZXR1cm4gcC52YWx1ZX0pfTt0LnByb3RvdHlwZS5mb3JFYWNoPWZ1bmN0aW9uKHAsbCl7Zm9yKHZhciBxPXRoaXMuZW50cmllcygpLHY7ISh2PXEubmV4dCgpKS5kb25lOyl2PXYudmFsdWUscC5jYWxsKGwsdlsxXSx2WzBdLHRoaXMpfTt0LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdPXQucHJvdG90eXBlLmVudHJpZXM7dmFyIHk9MDtyZXR1cm4gdH0sXCJlczZcIixcImVzM1wiKTtcbmcucG9seWZpbGwoXCJTdHJpbmcucHJvdG90eXBlLmVuZHNXaXRoXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbihoLG0pe3ZhciBuPWcuY2hlY2tTdHJpbmdBcmdzKHRoaXMsaCxcImVuZHNXaXRoXCIpO2grPVwiXCI7dm9pZCAwPT09bSYmKG09bi5sZW5ndGgpO209TWF0aC5tYXgoMCxNYXRoLm1pbihtfDAsbi5sZW5ndGgpKTtmb3IodmFyIHQ9aC5sZW5ndGg7MDx0JiYwPG07KWlmKG5bLS1tXSE9aFstLXRdKXJldHVybiExO3JldHVybiAwPj10fX0sXCJlczZcIixcImVzM1wiKTtnLnBvbHlmaWxsKFwiTnVtYmVyLmlzTmFOXCIsZnVuY3Rpb24oZSl7cmV0dXJuIGU/ZTpmdW5jdGlvbihoKXtyZXR1cm5cIm51bWJlclwiPT09dHlwZW9mIGgmJmlzTmFOKGgpfX0sXCJlczZcIixcImVzM1wiKTtcbmcucG9seWZpbGwoXCJPYmplY3QuZW50cmllc1wiLGZ1bmN0aW9uKGUpe3JldHVybiBlP2U6ZnVuY3Rpb24oaCl7dmFyIG09W10sbjtmb3IobiBpbiBoKWcub3ducyhoLG4pJiZtLnB1c2goW24saFtuXV0pO3JldHVybiBtfX0sXCJlczhcIixcImVzM1wiKTt2YXIgRz10aGlzO1xuZnVuY3Rpb24gSCgpe2Z1bmN0aW9uIGUoYSl7dGhpcy5vcHRzPXt9O3RoaXMuZGVmYXVsdHM9e307dGhpcy5tZXNzYWdlcz1PYmplY3QuYXNzaWduKHt9LHIpO3RoaXMucnVsZXM9e2FueTpTLGFycmF5OlQsYm9vbGVhbjpVLGNsYXNzOlYsY3VzdG9tOlcsY3VycmVuY3k6WCxkYXRlOlksZW1haWw6WixlbnVtOmFhLGVxdWFsOmJhLGZvcmJpZGRlbjpjYSxmdW5jdGlvbjpkYSxtdWx0aTpCLG51bWJlcjp2LG9iamVjdDpxLG9iamVjdElEOmwscmVjb3JkOnAsc3RyaW5nOnksdHVwbGU6eCx1cmw6dyx1dWlkOnQsbWFjOm4sbHVobjptfTt0aGlzLmFsaWFzZXM9e307dGhpcy5jYWNoZT1uZXcgTWFwO2lmKGEpe0EodGhpcy5vcHRzLGEpO2EuZGVmYXVsdHMmJkEodGhpcy5kZWZhdWx0cyxhLmRlZmF1bHRzKTtpZihhLm1lc3NhZ2VzKWZvcih2YXIgYiBpbiBhLm1lc3NhZ2VzKXRoaXMuYWRkTWVzc2FnZShiLGEubWVzc2FnZXNbYl0pO2lmKGEuYWxpYXNlcylmb3IodmFyIGMgaW4gYS5hbGlhc2VzKXRoaXMuYWxpYXMoYyxcbmEuYWxpYXNlc1tjXSk7aWYoYS5jdXN0b21SdWxlcylmb3IodmFyIGQgaW4gYS5jdXN0b21SdWxlcyl0aGlzLmFkZChkLGEuY3VzdG9tUnVsZXNbZF0pO2lmKGEucGx1Z2lucyl7YT1hLnBsdWdpbnM7aWYoIUFycmF5LmlzQXJyYXkoYSkpdGhyb3cgRXJyb3IoXCJQbHVnaW5zIHR5cGUgbXVzdCBiZSBhcnJheVwiKTthLmZvckVhY2godGhpcy5wbHVnaW4uYmluZCh0aGlzKSl9dGhpcy5vcHRzLmRlYnVnJiYoYT1mdW5jdGlvbihmKXtyZXR1cm4gZn0sXCJ1bmRlZmluZWRcIj09PXR5cGVvZiB3aW5kb3cmJihhPWgpLHRoaXMuX2Zvcm1hdHRlcj1hKX19ZnVuY3Rpb24gaChhKXtJfHwoST1OKCksTz17cGFyc2VyOlwiYmFiZWxcIix1c2VUYWJzOiExLHByaW50V2lkdGg6MTIwLHRyYWlsaW5nQ29tbWE6XCJub25lXCIsdGFiV2lkdGg6NCxzaW5nbGVRdW90ZTohMSxzZW1pOiEwLGJyYWNrZXRTcGFjaW5nOiEwfSxKPU4oKSxQPXtsYW5ndWFnZTpcImpzXCIsdGhlbWU6Si5mcm9tSnNvbih7a2V5d29yZDpbXCJ3aGl0ZVwiLFxuXCJib2xkXCJdLGJ1aWx0X2luOlwibWFnZW50YVwiLGxpdGVyYWw6XCJjeWFuXCIsbnVtYmVyOlwibWFnZW50YVwiLHJlZ2V4cDpcInJlZFwiLHN0cmluZzpbXCJ5ZWxsb3dcIixcImJvbGRcIl0sc3ltYm9sOlwicGxhaW5cIixjbGFzczpcImJsdWVcIixhdHRyOlwicGxhaW5cIixmdW5jdGlvbjpbXCJ3aGl0ZVwiLFwiYm9sZFwiXSx0aXRsZTpcInBsYWluXCIscGFyYW1zOlwiZ3JlZW5cIixjb21tZW50OlwiZ3JleVwifSl9KTthPUkuZm9ybWF0KGEsTyk7cmV0dXJuIEouaGlnaGxpZ2h0KGEsUCl9ZnVuY3Rpb24gbShhKXthLnNjaGVtYTthPWEubWVzc2FnZXM7cmV0dXJue3NvdXJjZTonXFxuXFx0XFx0XFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xcblxcdFxcdFxcdFxcdCcrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KSsnXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKVxcblxcdFxcdFxcdFxcdHZhbHVlID0gU3RyaW5nKHZhbHVlKTtcXG5cXG5cXHRcXHRcXHR2YWwgPSB2YWx1ZS5yZXBsYWNlKC9cXFxcRCsvZywgXCJcIik7XFxuXFxuXFx0XFx0XFx0dmFyIGFycmF5ID0gWzAsIDIsIDQsIDYsIDgsIDEsIDMsIDUsIDcsIDldO1xcblxcdFxcdFxcdHZhciBsZW4gPSB2YWwgPyB2YWwubGVuZ3RoIDogMCxcXG5cXHRcXHRcXHRcXHRiaXQgPSAxLFxcblxcdFxcdFxcdFxcdHN1bSA9IDA7XFxuXFx0XFx0XFx0d2hpbGUgKGxlbi0tKSB7XFxuXFx0XFx0XFx0XFx0c3VtICs9ICEoYml0IF49IDEpID8gcGFyc2VJbnQodmFsW2xlbl0sIDEwKSA6IGFycmF5W3ZhbFtsZW5dXTtcXG5cXHRcXHRcXHR9XFxuXFxuXFx0XFx0XFx0aWYgKCEoc3VtICUgMTAgPT09IDAgJiYgc3VtID4gMCkpIHtcXG5cXHRcXHRcXHRcXHQnK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJsdWhuXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFxuXFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFwifX1mdW5jdGlvbiBuKGEpe2Euc2NoZW1hO2E9YS5tZXNzYWdlcztyZXR1cm57c291cmNlOidcXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XFxuXFx0XFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ1wiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXG5cXHRcXHRcXHR2YXIgdiA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XFxuXFx0XFx0XFx0aWYgKCFcIitlYS50b1N0cmluZygpK1wiLnRlc3QodikpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm1hY1wiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFxcdFxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHRcIn19ZnVuY3Rpb24gdChhKXt2YXIgYj1cbmEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcblxcdFxcdHZhciB2YWwgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xcblxcdFxcdGlmICghXCIrZmEudG9TdHJpbmcoKStcIi50ZXN0KHZhbCkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInV1aWRcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFxuXFx0XFx0Y29uc3QgdmVyc2lvbiA9IHZhbC5jaGFyQXQoMTQpIHwgMDtcXG5cXHRcIik7Nz5wYXJzZUludChiLnZlcnNpb24pJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoXCIrYi52ZXJzaW9uK1wiICE9PSB2ZXJzaW9uKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ1dWlkVmVyc2lvblwiLFxuZXhwZWN0ZWQ6Yi52ZXJzaW9uLGFjdHVhbDpcInZlcnNpb25cIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtjLnB1c2goJ1xcblxcdFxcdHN3aXRjaCAodmVyc2lvbikge1xcblxcdFxcdGNhc2UgMDpcXG5cXHRcXHRjYXNlIDE6XFxuXFx0XFx0Y2FzZSAyOlxcblxcdFxcdGNhc2UgNjpcXG5cXHRcXHRcXHRicmVhaztcXG5cXHRcXHRjYXNlIDM6XFxuXFx0XFx0Y2FzZSA0OlxcblxcdFxcdGNhc2UgNTpcXG5cXHRcXHRcXHRpZiAoW1wiOFwiLCBcIjlcIiwgXCJhXCIsIFwiYlwiXS5pbmRleE9mKHZhbC5jaGFyQXQoMTkpKSA9PT0gLTEpIHtcXG5cXHRcXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwidXVpZFwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzb3VyY2U6Yy5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB3KGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHQnK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFx0XCIpO2IuZW1wdHk/Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlO1xcblxcdFxcdFwiKTpjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ1cmxFbXB0eVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0aWYgKCFcIitoYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ1cmxcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzb3VyY2U6Yy5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB4KGEsXG5iLGMpe3ZhciBkPWEuc2NoZW1hLGY9YS5tZXNzYWdlczthPVtdO2lmKG51bGwhPWQuaXRlbXMpe2lmKCFBcnJheS5pc0FycmF5KGQuaXRlbXMpKXRocm93IEVycm9yKFwiSW52YWxpZCAnXCIrZC50eXBlK1wiJyBzY2hlbWEuIFRoZSAnaXRlbXMnIGZpZWxkIG11c3QgYmUgYW4gYXJyYXkuXCIpO2lmKDA9PT1kLml0ZW1zLmxlbmd0aCl0aHJvdyBFcnJvcihcIkludmFsaWQgJ1wiK2QudHlwZStcIicgc2NoZW1hLiBUaGUgJ2l0ZW1zJyBmaWVsZCBtdXN0IG5vdCBiZSBhbiBlbXB0eSBhcnJheS5cIik7fWEucHVzaChcIlxcblxcdFxcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInR1cGxlXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcblxcdFxcdHZhciBsZW4gPSB2YWx1ZS5sZW5ndGg7XFxuXFx0XCIpOyExPT09ZC5lbXB0eSYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJ0dXBsZUVtcHR5XCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtpZihudWxsIT1kLml0ZW1zKXthLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoXCIrZC5lbXB0eStcIiAhPT0gZmFsc2UgJiYgbGVuID09PSAwKSB7XFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXG5cXHRcXHRcXHRpZiAobGVuICE9PSBcIitkLml0ZW1zLmxlbmd0aCtcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwidHVwbGVMZW5ndGhcIixleHBlY3RlZDpkLml0ZW1zLmxlbmd0aCxhY3R1YWw6XCJsZW5cIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTthLnB1c2goXCJcXG5cXHRcXHRcXHR2YXIgYXJyID0gdmFsdWU7XFxuXFx0XFx0XFx0dmFyIHBhcmVudEZpZWxkID0gZmllbGQ7XFxuXFx0XFx0XCIpO2ZvcihmPTA7ZjxkLml0ZW1zLmxlbmd0aDtmKyspe2EucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gYXJyW1wiK1xuZitcIl07XFxuXFx0XFx0XCIpO3ZhciBrPWIrXCJbXCIrZitcIl1cIix1PXRoaXMuZ2V0UnVsZUZyb21TY2hlbWEoZC5pdGVtc1tmXSk7YS5wdXNoKHRoaXMuY29tcGlsZVJ1bGUodSxjLGssXCJcXG5cXHRcXHRcXHRhcnJbXCIrZitcIl0gPSBcIisoYy5hc3luYz9cImF3YWl0IFwiOlwiXCIpK1wiY29udGV4dC5mblslJUlOREVYJSVdKGFycltcIitmKyddLCAocGFyZW50RmllbGQgPyBwYXJlbnRGaWVsZCA6IFwiXCIpICsgXCJbXCIgKyAnK2YrJyArIFwiXVwiLCBwYXJlbnQsIGVycm9ycywgY29udGV4dCk7XFxuXFx0XFx0JyxcImFycltcIitmK1wiXVwiKSl9YS5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIGFycjtcXG5cXHRcIil9ZWxzZSBhLnB1c2goXCJcXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzb3VyY2U6YS5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB5KGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXSxkPSExOyEwPT09Yi5jb252ZXJ0JiYoZD0hMCxjLnB1c2goJ1xcblxcdFxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XFxuXFx0XFx0XFx0fVxcblxcdFxcdCcpKTtcbmMucHVzaCgnXFxuXFx0XFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xcblxcdFxcdFxcdCcrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFxuXFx0XFx0dmFyIG9yaWdWYWx1ZSA9IHZhbHVlO1xcblxcdFwiKTtiLnRyaW0mJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudHJpbSgpO1xcblxcdFxcdFwiKSk7Yi50cmltTGVmdCYmKGQ9ITAsYy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFsdWUgPSB2YWx1ZS50cmltTGVmdCgpO1xcblxcdFxcdFwiKSk7Yi50cmltUmlnaHQmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudHJpbVJpZ2h0KCk7XFxuXFx0XFx0XCIpKTtiLnBhZFN0YXJ0JiYoZD0hMCxjLnB1c2goXCJcXG5cXHRcXHRcXHR2YWx1ZSA9IHZhbHVlLnBhZFN0YXJ0KFwiK2IucGFkU3RhcnQrXCIsIFwiK0pTT04uc3RyaW5naWZ5KG51bGwhPWIucGFkQ2hhcj9iLnBhZENoYXI6XCIgXCIpK1xuXCIpO1xcblxcdFxcdFwiKSk7Yi5wYWRFbmQmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUucGFkRW5kKFwiK2IucGFkRW5kK1wiLCBcIitKU09OLnN0cmluZ2lmeShudWxsIT1iLnBhZENoYXI/Yi5wYWRDaGFyOlwiIFwiKStcIik7XFxuXFx0XFx0XCIpKTtiLmxvd2VyY2FzZSYmKGQ9ITAsYy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFsdWUgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xcblxcdFxcdFwiKSk7Yi51cHBlcmNhc2UmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudG9VcHBlckNhc2UoKTtcXG5cXHRcXHRcIikpO2IubG9jYWxlTG93ZXJjYXNlJiYoZD0hMCxjLnB1c2goXCJcXG5cXHRcXHRcXHR2YWx1ZSA9IHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCk7XFxuXFx0XFx0XCIpKTtiLmxvY2FsZVVwcGVyY2FzZSYmKGQ9ITAsYy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFsdWUgPSB2YWx1ZS50b0xvY2FsZVVwcGVyQ2FzZSgpO1xcblxcdFxcdFwiKSk7Yy5wdXNoKFwiXFxuXFx0XFx0XFx0dmFyIGxlbiA9IHZhbHVlLmxlbmd0aDtcXG5cXHRcIik7XG4hMT09PWIuZW1wdHk/Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nRW1wdHlcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik6ITA9PT1iLmVtcHR5JiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAobGVuID09PSAwKSB7XFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Yi5taW4mJmMucHVzaChcIlxcblxcdFxcdFxcdGlmIChsZW4gPCBcIitiLm1pbitcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nTWluXCIsZXhwZWN0ZWQ6Yi5taW4sYWN0dWFsOlwibGVuXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1iLm1heCYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA+IFwiK2IubWF4K1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdNYXhcIixleHBlY3RlZDpiLm1heCxhY3R1YWw6XCJsZW5cIixcbm1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Yi5sZW5ndGgmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmIChsZW4gIT09IFwiK2IubGVuZ3RoK1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdMZW5ndGhcIixleHBlY3RlZDpiLmxlbmd0aCxhY3R1YWw6XCJsZW5cIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO2lmKG51bGwhPWIucGF0dGVybil7dmFyIGY9Yi5wYXR0ZXJuO1wic3RyaW5nXCI9PXR5cGVvZiBiLnBhdHRlcm4mJihmPW5ldyBSZWdFeHAoYi5wYXR0ZXJuLGIucGF0dGVybkZsYWdzKSk7Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKCFcIitmLnRvU3RyaW5nKCkrXCIudGVzdCh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ1BhdHRlcm5cIixleHBlY3RlZDonXCInK2YudG9TdHJpbmcoKS5yZXBsYWNlKC9cIi9nLFwiXFxcXCQmXCIpKydcIicsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKX1udWxsIT1cbmIuY29udGFpbnMmJmMucHVzaCgnXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmluZGV4T2YoXCInK2IuY29udGFpbnMrJ1wiKSA9PT0gLTEpIHtcXG5cXHRcXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nQ29udGFpbnNcIixleHBlY3RlZDonXCInK2IuY29udGFpbnMrJ1wiJyxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO251bGwhPWIuZW51bSYmKGY9SlNPTi5zdHJpbmdpZnkoYi5lbnVtKSxjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoXCIrZitcIi5pbmRleE9mKHZhbHVlKSA9PT0gLTEpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ0VudW1cIixleHBlY3RlZDonXCInK2IuZW51bS5qb2luKFwiLCBcIikrJ1wiJyxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpKTshMD09PWIubnVtZXJpYyYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKCFcIitpYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpICkge1xcblxcdFxcdFxcdFxcdFwiK1xudGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdOdW1lcmljXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIuYWxwaGEmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmKCFcIitqYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJzdHJpbmdBbHBoYVwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7ITA9PT1iLmFscGhhbnVtJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZighXCIra2EudG9TdHJpbmcoKStcIi50ZXN0KHZhbHVlKSkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nQWxwaGFudW1cIixhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpOyEwPT09Yi5hbHBoYWRhc2gmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmKCFcIitsYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XFx0XCIrXG50aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ0FscGhhZGFzaFwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7ITA9PT1iLmhleCYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYodmFsdWUubGVuZ3RoICUgMiAhPT0gMCB8fCAhXCIrbWEudG9TdHJpbmcoKStcIi50ZXN0KHZhbHVlKSkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nSGV4XCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIuc2luZ2xlTGluZSYmYy5wdXNoKCdcXG5cXHRcXHRcXHRpZih2YWx1ZS5pbmNsdWRlcyhcIlxcXFxuXCIpKSB7XFxuXFx0XFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ1NpbmdsZUxpbmVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpOyEwPT09Yi5iYXNlNjQmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmKCFcIituYS50b1N0cmluZygpK1wiLnRlc3QodmFsdWUpKSB7XFxuXFx0XFx0XFx0XFx0XCIrXG50aGlzLm1ha2VFcnJvcih7dHlwZTpcInN0cmluZ0Jhc2U2NFwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gcChhLGIsYyl7dmFyIGQ9YS5zY2hlbWEsZj1bXTtmLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgdmFsdWUgPT09IG51bGwgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwicmVjb3JkXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphLm1lc3NhZ2VzfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcdFwiKTthPWQua2V5fHxcInN0cmluZ1wiO2Q9ZC52YWx1ZXx8XCJhbnlcIjtmLnB1c2goXCJcXG5cXHRcXHRjb25zdCByZWNvcmQgPSB2YWx1ZTtcXG5cXHRcXHRsZXQgc2FuaXRpemVkS2V5LCBzYW5pdGl6ZWRWYWx1ZTtcXG5cXHRcXHRjb25zdCByZXN1bHQgPSB7fTtcXG5cXHRcXHRmb3IgKGxldCBrZXkgaW4gdmFsdWUpIHtcXG5cXHRcIik7XG5mLnB1c2goXCJzYW5pdGl6ZWRLZXkgPSB2YWx1ZSA9IGtleTtcIik7YT10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGEpO2Zvcih2YXIgayBpbiBhLm1lc3NhZ2VzKWsuc3RhcnRzV2l0aChcInN0cmluZ1wiKSYmKGEubWVzc2FnZXNba109YS5tZXNzYWdlc1trXS5yZXBsYWNlKFwiIGZpZWxkIFwiLFwiIGtleSBcIikpO2YucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGEsYyxudWxsLFwiXFxuXFx0XFx0c2FuaXRpemVkS2V5ID0gXCIrKGMuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKSsnY29udGV4dC5mblslJUlOREVYJSVdKGtleSwgZmllbGQgPyBmaWVsZCArIFwiLlwiICsga2V5IDoga2V5LCByZWNvcmQsIGVycm9ycywgY29udGV4dCk7XFxuXFx0JyxcInNhbml0aXplZEtleVwiKSk7Zi5wdXNoKFwic2FuaXRpemVkVmFsdWUgPSB2YWx1ZSA9IHJlY29yZFtrZXldO1wiKTtrPXRoaXMuZ2V0UnVsZUZyb21TY2hlbWEoZCk7Zi5wdXNoKHRoaXMuY29tcGlsZVJ1bGUoayxjLGIrXCJba2V5XVwiLFwiXFxuXFx0XFx0c2FuaXRpemVkVmFsdWUgPSBcIisoYy5hc3luYz9cblwiYXdhaXQgXCI6XCJcIikrJ2NvbnRleHQuZm5bJSVJTkRFWCUlXSh2YWx1ZSwgZmllbGQgPyBmaWVsZCArIFwiLlwiICsga2V5IDoga2V5LCByZWNvcmQsIGVycm9ycywgY29udGV4dCk7XFxuXFx0JyxcInNhbml0aXplZFZhbHVlXCIpKTtmLnB1c2goXCJyZXN1bHRbc2FuaXRpemVkS2V5XSA9IHNhbml0aXplZFZhbHVlO1wiKTtmLnB1c2goXCJcXG5cXHRcXHR9XFxuXFx0XCIpO2YucHVzaChcInJldHVybiByZXN1bHQ7XCIpO3JldHVybntzb3VyY2U6Zi5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBsKGEsYixjKXtiPWEuc2NoZW1hO3ZhciBkPWEubWVzc2FnZXM7YT1hLmluZGV4O3ZhciBmPVtdO2MuY3VzdG9tc1thXT9jLmN1c3RvbXNbYV0uc2NoZW1hPWI6Yy5jdXN0b21zW2FdPXtzY2hlbWE6Yn07Zi5wdXNoKFwiXFxuXFx0XFx0Y29uc3QgT2JqZWN0SUQgPSBjb250ZXh0LmN1c3RvbXNbXCIrYStcIl0uc2NoZW1hLk9iamVjdElEO1xcblxcdFxcdGlmICghT2JqZWN0SUQuaXNWYWxpZCh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm9iamVjdElEXCIsXG5hY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmR9KStcIlxcblxcdFxcdFxcdHJldHVybjtcXG5cXHRcXHR9XFxuXFx0XCIpOyEwPT09Yi5jb252ZXJ0P2YucHVzaChcInJldHVybiBuZXcgT2JqZWN0SUQodmFsdWUpXCIpOlwiaGV4U3RyaW5nXCI9PT1iLmNvbnZlcnQ/Zi5wdXNoKFwicmV0dXJuIHZhbHVlLnRvU3RyaW5nKClcIik6Zi5wdXNoKFwicmV0dXJuIHZhbHVlXCIpO3JldHVybntzb3VyY2U6Zi5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBxKGEsYixjKXt2YXIgZD10aGlzLGY9YS5zY2hlbWE7YT1hLm1lc3NhZ2VzO3ZhciBrPVtdO2sucHVzaCgnXFxuXFx0XFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCB2YWx1ZSA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xcblxcdFxcdFxcdCcrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJvYmplY3RcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFx0XCIpO3ZhciB1PWYucHJvcGVydGllc3x8Zi5wcm9wcztcbmlmKHUpe2sucHVzaChcInZhciBwYXJlbnRPYmogPSB2YWx1ZTtcIik7ay5wdXNoKFwidmFyIHBhcmVudEZpZWxkID0gZmllbGQ7XCIpO2Zvcih2YXIgej1PYmplY3Qua2V5cyh1KS5maWx0ZXIoZnVuY3Rpb24ob2Epe3JldHVybiFkLmlzTWV0YUtleShvYSl9KSxDPTA7Qzx6Lmxlbmd0aDtDKyspe3ZhciBEPXpbQ10sRT1LKEQpLFE9cGEudGVzdChFKT9cIi5cIitFOlwiWydcIitFK1wiJ11cIixMPVwicGFyZW50T2JqXCIrUSxSPShiP2IrXCIuXCI6XCJcIikrRCxGPXVbRF0ubGFiZWw7Rj1GP1wiJ1wiK0soRikrXCInXCI6dm9pZCAwO2sucHVzaChcIlxcbi8vIEZpZWxkOiBcIitLKFIpKTtrLnB1c2goJ2ZpZWxkID0gcGFyZW50RmllbGQgPyBwYXJlbnRGaWVsZCArIFwiJytRKydcIiA6IFwiJytFKydcIjsnKTtrLnB1c2goXCJ2YWx1ZSA9IFwiK0wrXCI7XCIpO2sucHVzaChcImxhYmVsID0gXCIrRik7RD10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKHVbRF0pO2sucHVzaCh0aGlzLmNvbXBpbGVSdWxlKEQsYyxSLFwiXFxuXFx0XFx0XFx0XFx0XCIrTCtcIiA9IFwiK1xuKGMuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKStcImNvbnRleHQuZm5bJSVJTkRFWCUlXSh2YWx1ZSwgZmllbGQsIHBhcmVudE9iaiwgZXJyb3JzLCBjb250ZXh0LCBsYWJlbCk7XFxuXFx0XFx0XFx0XCIsTCkpOyEwPT09dGhpcy5vcHRzLmhhbHRPbkZpcnN0RXJyb3ImJmsucHVzaChcImlmIChlcnJvcnMubGVuZ3RoKSByZXR1cm4gcGFyZW50T2JqO1wiKX1mLnN0cmljdCYmKGI9T2JqZWN0LmtleXModSksay5wdXNoKFwiXFxuXFx0XFx0XFx0XFx0ZmllbGQgPSBwYXJlbnRGaWVsZDtcXG5cXHRcXHRcXHRcXHR2YXIgaW52YWxpZFByb3BzID0gW107XFxuXFx0XFx0XFx0XFx0dmFyIHByb3BzID0gT2JqZWN0LmtleXMocGFyZW50T2JqKTtcXG5cXG5cXHRcXHRcXHRcXHRmb3IgKGxldCBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XFxuXFx0XFx0XFx0XFx0XFx0aWYgKFwiK0pTT04uc3RyaW5naWZ5KGIpK1wiLmluZGV4T2YocHJvcHNbaV0pID09PSAtMSkge1xcblxcdFxcdFxcdFxcdFxcdFxcdGludmFsaWRQcm9wcy5wdXNoKHByb3BzW2ldKTtcXG5cXHRcXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdFxcdGlmIChpbnZhbGlkUHJvcHMubGVuZ3RoKSB7XFxuXFx0XFx0XFx0XCIpLFxuXCJyZW1vdmVcIj09PWYuc3RyaWN0PyhrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHRpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiKSxrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHRcXHRpbnZhbGlkUHJvcHMuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xcblxcdFxcdFxcdFxcdFxcdFxcdFxcdGRlbGV0ZSBwYXJlbnRPYmpbZmllbGRdO1xcblxcdFxcdFxcdFxcdFxcdFxcdH0pO1xcblxcdFxcdFxcdFxcdFwiKSxrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0XFx0XCIpKTprLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm9iamVjdFN0cmljdFwiLGV4cGVjdGVkOidcIicrYi5qb2luKFwiLCBcIikrJ1wiJyxhY3R1YWw6XCJpbnZhbGlkUHJvcHMuam9pbignLCAnKVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdFxcdFwiKSxrLnB1c2goXCJcXG5cXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0XCIpKX1pZihudWxsIT1mLm1pblByb3BzfHxudWxsIT1mLm1heFByb3BzKWYuc3RyaWN0P2sucHVzaChcIlxcblxcdFxcdFxcdFxcdHByb3BzID0gT2JqZWN0LmtleXMoXCIrXG4odT9cInBhcmVudE9ialwiOlwidmFsdWVcIikrXCIpO1xcblxcdFxcdFxcdFwiKTprLnB1c2goXCJcXG5cXHRcXHRcXHRcXHR2YXIgcHJvcHMgPSBPYmplY3Qua2V5cyhcIisodT9cInBhcmVudE9ialwiOlwidmFsdWVcIikrXCIpO1xcblxcdFxcdFxcdFxcdFwiKyh1P1wiZmllbGQgPSBwYXJlbnRGaWVsZDtcIjpcIlwiKStcIlxcblxcdFxcdFxcdFwiKTtudWxsIT1mLm1pblByb3BzJiZrLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAocHJvcHMubGVuZ3RoIDwgXCIrZi5taW5Qcm9wcytcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwib2JqZWN0TWluUHJvcHNcIixleHBlY3RlZDpmLm1pblByb3BzLGFjdHVhbDpcInByb3BzLmxlbmd0aFwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Zi5tYXhQcm9wcyYmay5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHByb3BzLmxlbmd0aCA+IFwiK2YubWF4UHJvcHMrXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm9iamVjdE1heFByb3BzXCIsZXhwZWN0ZWQ6Zi5tYXhQcm9wcyxhY3R1YWw6XCJwcm9wcy5sZW5ndGhcIixcbm1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7dT9rLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gcGFyZW50T2JqO1xcblxcdFxcdFwiKTprLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XCIpO3JldHVybntzb3VyY2U6ay5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiB2KGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goXCJcXG5cXHRcXHR2YXIgb3JpZ1ZhbHVlID0gdmFsdWU7XFxuXFx0XCIpO3ZhciBkPSExOyEwPT09Yi5jb252ZXJ0JiYoZD0hMCxjLnB1c2goJ1xcblxcdFxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwibnVtYmVyXCIpIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IE51bWJlcih2YWx1ZSk7XFxuXFx0XFx0XFx0fVxcblxcdFxcdCcpKTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwibnVtYmVyXCIgfHwgaXNOYU4odmFsdWUpIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwibnVtYmVyXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsXG5tZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcdFwiKTtudWxsIT1iLm1pbiYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlIDwgXCIrYi5taW4rXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm51bWJlck1pblwiLGV4cGVjdGVkOmIubWluLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9Yi5tYXgmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSA+IFwiK2IubWF4K1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJNYXhcIixleHBlY3RlZDpiLm1heCxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO251bGwhPWIuZXF1YWwmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSAhPT0gXCIrYi5lcXVhbCtcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwibnVtYmVyRXF1YWxcIixleHBlY3RlZDpiLmVxdWFsLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLFxubWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1iLm5vdEVxdWFsJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUgPT09IFwiK2Iubm90RXF1YWwrXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcIm51bWJlck5vdEVxdWFsXCIsZXhwZWN0ZWQ6Yi5ub3RFcXVhbCxhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpOyEwPT09Yi5pbnRlZ2VyJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUgJSAxICE9PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJJbnRlZ2VyXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIucG9zaXRpdmUmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSA8PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJQb3NpdGl2ZVwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcblwiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWIubmVnYXRpdmUmJmMucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZSA+PSAwKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJudW1iZXJOZWdhdGl2ZVwiLGFjdHVhbDpcIm9yaWdWYWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gQihhLGIsYyl7dmFyIGQ9YS5zY2hlbWE7YS5tZXNzYWdlczthPVtdO2EucHVzaChcIlxcblxcdFxcdHZhciBoYXNWYWxpZCA9IGZhbHNlO1xcblxcdFxcdHZhciBuZXdWYWwgPSB2YWx1ZTtcXG5cXHRcXHR2YXIgY2hlY2tFcnJvcnMgPSBbXTtcXG5cXHRcXHR2YXIgZXJyb3JzU2l6ZSA9IGVycm9ycy5sZW5ndGg7XFxuXFx0XCIpO2Zvcih2YXIgZj0wO2Y8ZC5ydWxlcy5sZW5ndGg7ZisrKXthLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAoIWhhc1ZhbGlkKSB7XFxuXFx0XFx0XFx0XFx0dmFyIF9lcnJvcnMgPSBbXTtcXG5cXHRcXHRcIik7XG52YXIgaz10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGQucnVsZXNbZl0pO2EucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGssYyxiLFwidmFyIHRtcFZhbCA9IFwiKyhjLmFzeW5jP1wiYXdhaXQgXCI6XCJcIikrXCJjb250ZXh0LmZuWyUlSU5ERVglJV0odmFsdWUsIGZpZWxkLCBwYXJlbnQsIF9lcnJvcnMsIGNvbnRleHQpO1wiLFwidG1wVmFsXCIpKTthLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRpZiAoZXJyb3JzLmxlbmd0aCA9PSBlcnJvcnNTaXplICYmIF9lcnJvcnMubGVuZ3RoID09IDApIHtcXG5cXHRcXHRcXHRcXHRcXHRoYXNWYWxpZCA9IHRydWU7XFxuXFx0XFx0XFx0XFx0XFx0bmV3VmFsID0gdG1wVmFsO1xcblxcdFxcdFxcdFxcdH0gZWxzZSB7XFxuXFx0XFx0XFx0XFx0XFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoY2hlY2tFcnJvcnMsIFtdLmNvbmNhdChfZXJyb3JzLCBlcnJvcnMuc3BsaWNlKGVycm9yc1NpemUpKSk7XFxuXFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIil9YS5wdXNoKFwiXFxuXFx0XFx0aWYgKCFoYXNWYWxpZCkge1xcblxcdFxcdFxcdEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGVycm9ycywgY2hlY2tFcnJvcnMpO1xcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gbmV3VmFsO1xcblxcdFwiKTtcbnJldHVybntzb3VyY2U6YS5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBkYShhKXthLnNjaGVtYTtyZXR1cm57c291cmNlOidcXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpXFxuXFx0XFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcImZ1bmN0aW9uXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphLm1lc3NhZ2VzfSkrXCJcXG5cXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0XCJ9fWZ1bmN0aW9uIGNhKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtjLnB1c2goXCJcXG5cXHRcXHRpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xcblxcdFwiKTtiLnJlbW92ZT9jLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gdW5kZWZpbmVkO1xcblxcdFxcdFwiKTpjLnB1c2goXCJcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImZvcmJpZGRlblwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XCIpO2MucHVzaChcIlxcblxcdFxcdH1cXG5cXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO1xucmV0dXJue3NvdXJjZTpjLmpvaW4oXCJcXG5cIil9fWZ1bmN0aW9uIGJhKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXTtiLmZpZWxkPyhiLnN0cmljdD9jLnB1c2goJ1xcblxcdFxcdFxcdFxcdGlmICh2YWx1ZSAhPT0gcGFyZW50W1wiJytiLmZpZWxkKydcIl0pXFxuXFx0XFx0XFx0Jyk6Yy5wdXNoKCdcXG5cXHRcXHRcXHRcXHRpZiAodmFsdWUgIT0gcGFyZW50W1wiJytiLmZpZWxkKydcIl0pXFxuXFx0XFx0XFx0JyksYy5wdXNoKFwiXFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJlcXVhbEZpZWxkXCIsYWN0dWFsOlwidmFsdWVcIixleHBlY3RlZDpKU09OLnN0cmluZ2lmeShiLmZpZWxkKSxtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcIikpOihiLnN0cmljdD9jLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRpZiAodmFsdWUgIT09IFwiK0pTT04uc3RyaW5naWZ5KGIudmFsdWUpK1wiKVxcblxcdFxcdFxcdFwiKTpjLnB1c2goXCJcXG5cXHRcXHRcXHRcXHRpZiAodmFsdWUgIT0gXCIrSlNPTi5zdHJpbmdpZnkoYi52YWx1ZSkrXCIpXFxuXFx0XFx0XFx0XCIpLFxuYy5wdXNoKFwiXFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJlcXVhbFZhbHVlXCIsYWN0dWFsOlwidmFsdWVcIixleHBlY3RlZDpKU09OLnN0cmluZ2lmeShiLnZhbHVlKSxtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcIikpO2MucHVzaChcIlxcblxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcIik7cmV0dXJue3NvdXJjZTpjLmpvaW4oXCJcXG5cIil9fWZ1bmN0aW9uIGFhKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlcztyZXR1cm57c291cmNlOlwiXFxuXFx0XFx0XFx0aWYgKFwiK0pTT04uc3RyaW5naWZ5KGIudmFsdWVzfHxbXSkrXCIuaW5kZXhPZih2YWx1ZSkgPT09IC0xKVxcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiZW51bVZhbHVlXCIsZXhwZWN0ZWQ6J1wiJytiLnZhbHVlcy5qb2luKFwiLCBcIikrJ1wiJyxhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdFxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHRcIn19ZnVuY3Rpb24gWihhKXt2YXIgYj1hLnNjaGVtYTthPWEubWVzc2FnZXM7XG52YXIgYz1bXSxkPVwicHJlY2lzZVwiPT1iLm1vZGU/cWE6cmEsZj0hMTtjLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcXG5cXHRcXHRcXHQnK3RoaXMubWFrZUVycm9yKHt0eXBlOlwic3RyaW5nXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XFx0fVxcblxcdFwiKTtiLmVtcHR5P2MucHVzaChcIlxcblxcdFxcdFxcdGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZTtcXG5cXHRcXHRcIik6Yy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiZW1haWxFbXB0eVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yi5ub3JtYWxpemUmJihmPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdHZhbHVlID0gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XFxuXFx0XFx0XCIpKTtudWxsIT1cbmIubWluJiZjLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUubGVuZ3RoIDwgXCIrYi5taW4rXCIpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImVtYWlsTWluXCIsZXhwZWN0ZWQ6Yi5taW4sYWN0dWFsOlwidmFsdWUubGVuZ3RoXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1iLm1heCYmYy5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmxlbmd0aCA+IFwiK2IubWF4K1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJlbWFpbE1heFwiLGV4cGVjdGVkOmIubWF4LGFjdHVhbDpcInZhbHVlLmxlbmd0aFwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7Yy5wdXNoKFwiXFxuXFx0XFx0aWYgKCFcIitkLnRvU3RyaW5nKCkrXCIudGVzdCh2YWx1ZSkpIHtcXG5cXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImVtYWlsXCIsYWN0dWFsOlwidmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHR9XFxuXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmYsXG5zb3VyY2U6Yy5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBZKGEpe3ZhciBiPWEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1bXSxkPSExO2MucHVzaChcIlxcblxcdFxcdHZhciBvcmlnVmFsdWUgPSB2YWx1ZTtcXG5cXHRcIik7ITA9PT1iLmNvbnZlcnQmJihkPSEwLGMucHVzaChcIlxcblxcdFxcdFxcdGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IG5ldyBEYXRlKHZhbHVlLmxlbmd0aCAmJiAhaXNOYU4oK3ZhbHVlKSA/ICt2YWx1ZSA6IHZhbHVlKTtcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpKTtjLnB1c2goXCJcXG5cXHRcXHRpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHx8IGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpXFxuXFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJkYXRlXCIsYWN0dWFsOlwib3JpZ1ZhbHVlXCIsbWVzc2FnZXM6YX0pK1wiXFxuXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gWChhKXt2YXIgYj1cbmEuc2NoZW1hO2E9YS5tZXNzYWdlczt2YXIgYz1iLmN1cnJlbmN5U3ltYm9sfHxudWxsLGQ9Yi50aG91c2FuZFNlcGFyYXRvcnx8XCIsXCIsZj1iLmRlY2ltYWxTZXBhcmF0b3J8fFwiLlwiLGs9Yi5jdXN0b21SZWdleDtiPSFiLnN5bWJvbE9wdGlvbmFsO2I9XCIoPz0uKlxcXFxkKV4oLT9+MXx+MS0/KSgoWzAtOV1cXFxcZHswLDJ9KH4yXFxcXGR7M30pKil8MCk/KFxcXFx+M1xcXFxkezEsMn0pPyRcIi5yZXBsYWNlKC9+MS9nLGM/XCJcXFxcXCIrYysoYj9cIlwiOlwiP1wiKTpcIlwiKS5yZXBsYWNlKFwifjJcIixkKS5yZXBsYWNlKFwifjNcIixmKTtjPVtdO2MucHVzaChcIlxcblxcdFxcdGlmICghdmFsdWUubWF0Y2goXCIrKGt8fG5ldyBSZWdFeHAoYikpK1wiKSkge1xcblxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiY3VycmVuY3lcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmF9KStcIlxcblxcdFxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcXHR9XFxuXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gVyhhLFxuYixjKXt2YXIgZD1bXTtkLnB1c2goXCJcXG5cXHRcXHRcIit0aGlzLm1ha2VDdXN0b21WYWxpZGF0b3Ioe2ZuTmFtZTpcImNoZWNrXCIscGF0aDpiLHNjaGVtYTphLnNjaGVtYSxtZXNzYWdlczphLm1lc3NhZ2VzLGNvbnRleHQ6YyxydWxlSW5kZXg6YS5pbmRleH0pK1wiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c291cmNlOmQuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gVihhLGIsYyl7Yj1hLnNjaGVtYTt2YXIgZD1hLm1lc3NhZ2VzO2E9YS5pbmRleDt2YXIgZj1bXSxrPWIuaW5zdGFuY2VPZi5uYW1lP2IuaW5zdGFuY2VPZi5uYW1lOlwiPFVua25vd0NsYXNzPlwiO2MuY3VzdG9tc1thXT9jLmN1c3RvbXNbYV0uc2NoZW1hPWI6Yy5jdXN0b21zW2FdPXtzY2hlbWE6Yn07Zi5wdXNoKFwiXFxuXFx0XFx0aWYgKCEodmFsdWUgaW5zdGFuY2VvZiBjb250ZXh0LmN1c3RvbXNbXCIrYStcIl0uc2NoZW1hLmluc3RhbmNlT2YpKVxcblxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiY2xhc3NJbnN0YW5jZU9mXCIsXG5hY3R1YWw6XCJ2YWx1ZVwiLGV4cGVjdGVkOlwiJ1wiK2srXCInXCIsbWVzc2FnZXM6ZH0pK1wiXFxuXFx0XCIpO2YucHVzaChcIlxcblxcdFxcdHJldHVybiB2YWx1ZTtcXG5cXHRcIik7cmV0dXJue3NvdXJjZTpmLmpvaW4oXCJcXG5cIil9fWZ1bmN0aW9uIFUoYSl7dmFyIGI9YS5zY2hlbWE7YT1hLm1lc3NhZ2VzO3ZhciBjPVtdLGQ9ITE7Yy5wdXNoKFwiXFxuXFx0XFx0dmFyIG9yaWdWYWx1ZSA9IHZhbHVlO1xcblxcdFwiKTshMD09PWIuY29udmVydCYmKGQ9ITAsYy5wdXNoKCdcXG5cXHRcXHRcXHRpZiAodHlwZW9mIHZhbHVlICE9PSBcImJvb2xlYW5cIikge1xcblxcdFxcdFxcdFxcdGlmIChcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9PT0gMVxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcInRydWVcIlxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcIjFcIlxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcIm9uXCJcXG5cXHRcXHRcXHRcXHQpIHtcXG5cXHRcXHRcXHRcXHRcXHR2YWx1ZSA9IHRydWU7XFxuXFx0XFx0XFx0XFx0fSBlbHNlIGlmIChcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9PT0gMFxcblxcdFxcdFxcdFxcdHx8IHZhbHVlID09PSBcImZhbHNlXCJcXG5cXHRcXHRcXHRcXHR8fCB2YWx1ZSA9PT0gXCIwXCJcXG5cXHRcXHRcXHRcXHR8fCB2YWx1ZSA9PT0gXCJvZmZcIlxcblxcdFxcdFxcdFxcdCkge1xcblxcdFxcdFxcdFxcdFxcdHZhbHVlID0gZmFsc2U7XFxuXFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdH1cXG5cXHRcXHQnKSk7XG5jLnB1c2goJ1xcblxcdFxcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwiYm9vbGVhblwiKSB7XFxuXFx0XFx0XFx0Jyt0aGlzLm1ha2VFcnJvcih7dHlwZTpcImJvb2xlYW5cIixhY3R1YWw6XCJvcmlnVmFsdWVcIixtZXNzYWdlczphfSkrXCJcXG5cXHRcXHR9XFxuXFx0XFx0XFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c2FuaXRpemVkOmQsc291cmNlOmMuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gVChhLGIsYyl7dmFyIGQ9YS5zY2hlbWEsZj1hLm1lc3NhZ2VzO2E9W107dmFyIGs9ITE7ITA9PT1kLmNvbnZlcnQmJihrPSEwLGEucHVzaChcIlxcblxcdFxcdFxcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUgIT0gbnVsbCkge1xcblxcdFxcdFxcdFxcdHZhbHVlID0gW3ZhbHVlXTtcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpKTthLnB1c2goXCJcXG5cXHRcXHRpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XFxuXFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJhcnJheVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFxcdH1cXG5cXG5cXHRcXHR2YXIgbGVuID0gdmFsdWUubGVuZ3RoO1xcblxcdFwiKTtcbiExPT09ZC5lbXB0eSYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA9PT0gMCkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlFbXB0eVwiLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtudWxsIT1kLm1pbiYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKGxlbiA8IFwiK2QubWluK1wiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJhcnJheU1pblwiLGV4cGVjdGVkOmQubWluLGFjdHVhbDpcImxlblwiLG1lc3NhZ2VzOmZ9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9ZC5tYXgmJmEucHVzaChcIlxcblxcdFxcdFxcdGlmIChsZW4gPiBcIitkLm1heCtcIikge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlNYXhcIixleHBlY3RlZDpkLm1heCxhY3R1YWw6XCJsZW5cIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpO251bGwhPWQubGVuZ3RoJiZhLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAobGVuICE9PSBcIitkLmxlbmd0aCtcblwiKSB7XFxuXFx0XFx0XFx0XFx0XCIrdGhpcy5tYWtlRXJyb3Ioe3R5cGU6XCJhcnJheUxlbmd0aFwiLGV4cGVjdGVkOmQubGVuZ3RoLGFjdHVhbDpcImxlblwiLG1lc3NhZ2VzOmZ9KStcIlxcblxcdFxcdFxcdH1cXG5cXHRcXHRcIik7bnVsbCE9ZC5jb250YWlucyYmYS5wdXNoKFwiXFxuXFx0XFx0XFx0aWYgKHZhbHVlLmluZGV4T2YoXCIrSlNPTi5zdHJpbmdpZnkoZC5jb250YWlucykrXCIpID09PSAtMSkge1xcblxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlDb250YWluc1wiLGV4cGVjdGVkOkpTT04uc3RyaW5naWZ5KGQuY29udGFpbnMpLGFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTshMD09PWQudW5pcXVlJiZhLnB1c2goXCJcXG5cXHRcXHRcXHRpZihsZW4gPiAobmV3IFNldCh2YWx1ZSkpLnNpemUpIHtcXG5cXHRcXHRcXHRcXHRcIit0aGlzLm1ha2VFcnJvcih7dHlwZTpcImFycmF5VW5pcXVlXCIsZXhwZWN0ZWQ6XCJBcnJheS5mcm9tKG5ldyBTZXQodmFsdWUuZmlsdGVyKChpdGVtLCBpbmRleCkgPT4gdmFsdWUuaW5kZXhPZihpdGVtKSAhPT0gaW5kZXgpKSlcIixcbmFjdHVhbDpcInZhbHVlXCIsbWVzc2FnZXM6Zn0pK1wiXFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKTtpZihudWxsIT1kLmVudW0pe3ZhciB1PUpTT04uc3RyaW5naWZ5KGQuZW51bSk7YS5wdXNoKFwiXFxuXFx0XFx0XFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xcblxcdFxcdFxcdFxcdGlmIChcIit1K1wiLmluZGV4T2YodmFsdWVbaV0pID09PSAtMSkge1xcblxcdFxcdFxcdFxcdFxcdFwiK3RoaXMubWFrZUVycm9yKHt0eXBlOlwiYXJyYXlFbnVtXCIsZXhwZWN0ZWQ6J1wiJytkLmVudW0uam9pbihcIiwgXCIpKydcIicsYWN0dWFsOlwidmFsdWVbaV1cIixtZXNzYWdlczpmfSkrXCJcXG5cXHRcXHRcXHRcXHR9XFxuXFx0XFx0XFx0fVxcblxcdFxcdFwiKX1udWxsIT1kLml0ZW1zPyhhLnB1c2goXCJcXG5cXHRcXHRcXHR2YXIgYXJyID0gdmFsdWU7XFxuXFx0XFx0XFx0dmFyIHBhcmVudEZpZWxkID0gZmllbGQ7XFxuXFx0XFx0XFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IGFycltpXTtcXG5cXHRcXHRcIiksYis9XG5cIltdXCIsZD10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGQuaXRlbXMpLGEucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGQsYyxiLFwiYXJyW2ldID0gXCIrKGMuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKSsnY29udGV4dC5mblslJUlOREVYJSVdKGFycltpXSwgKHBhcmVudEZpZWxkID8gcGFyZW50RmllbGQgOiBcIlwiKSArIFwiW1wiICsgaSArIFwiXVwiLCBwYXJlbnQsIGVycm9ycywgY29udGV4dCknLFwiYXJyW2ldXCIpKSxhLnB1c2goXCJcXG5cXHRcXHRcXHR9XFxuXFx0XFx0XCIpLGEucHVzaChcIlxcblxcdFxcdHJldHVybiBhcnI7XFxuXFx0XCIpKTphLnB1c2goXCJcXG5cXHRcXHRyZXR1cm4gdmFsdWU7XFxuXFx0XCIpO3JldHVybntzYW5pdGl6ZWQ6ayxzb3VyY2U6YS5qb2luKFwiXFxuXCIpfX1mdW5jdGlvbiBTKCl7dmFyIGE9W107YS5wdXNoKFwiXFxuXFx0XFx0cmV0dXJuIHZhbHVlO1xcblxcdFwiKTtyZXR1cm57c291cmNlOmEuam9pbihcIlxcblwiKX19ZnVuY3Rpb24gc2EoYSxiLGMpe3JldHVybiBhLnJlcGxhY2UoYix2b2lkIDA9PT1jfHxudWxsPT09Yz9cIlwiOlwiZnVuY3Rpb25cIj09PVxudHlwZW9mIGMudG9TdHJpbmc/Yzp0eXBlb2YgYyl9ZnVuY3Rpb24gQShhLGIsYyl7dm9pZCAwPT09YyYmKGM9e30pO2Zvcih2YXIgZCBpbiBiKXt2YXIgZj1iW2RdO2Y9XCJvYmplY3RcIiE9PXR5cGVvZiBmfHxBcnJheS5pc0FycmF5KGYpfHxudWxsPT1mPyExOjA8T2JqZWN0LmtleXMoZikubGVuZ3RoO2lmKGYpYVtkXT1hW2RdfHx7fSxBKGFbZF0sYltkXSxjKTtlbHNlIGlmKCEwIT09Yy5za2lwSWZFeGlzdHx8dm9pZCAwPT09YVtkXSlhW2RdPWJbZF19cmV0dXJuIGF9ZnVuY3Rpb24gSyhhKXtyZXR1cm4gYS5yZXBsYWNlKHRhLGZ1bmN0aW9uKGIpe3N3aXRjaChiKXtjYXNlICdcIic6Y2FzZSBcIidcIjpjYXNlIFwiXFxcXFwiOnJldHVyblwiXFxcXFwiK2I7Y2FzZSBcIlxcblwiOnJldHVyblwiXFxcXG5cIjtjYXNlIFwiXFxyXCI6cmV0dXJuXCJcXFxcclwiO2Nhc2UgXCJcXHUyMDI4XCI6cmV0dXJuXCJcXFxcdTIwMjhcIjtjYXNlIFwiXFx1MjAyOVwiOnJldHVyblwiXFxcXHUyMDI5XCJ9fSl9ZnVuY3Rpb24gTigpe3Rocm93IEVycm9yKFwiRHluYW1pYyByZXF1aXJlcyBhcmUgbm90IGN1cnJlbnRseSBzdXBwb3J0ZWQgYnkgcm9sbHVwLXBsdWdpbi1jb21tb25qc1wiKTtcbn12YXIgcj17cmVxdWlyZWQ6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGlzIHJlcXVpcmVkLlwiLHN0cmluZzpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHN0cmluZy5cIixzdHJpbmdFbXB0eTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBub3QgYmUgZW1wdHkuXCIsc3RyaW5nTWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfSBjaGFyYWN0ZXJzIGxvbmcuXCIsc3RyaW5nTWF4OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfSBjaGFyYWN0ZXJzIGxvbmcuXCIsc3RyaW5nTGVuZ3RoOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSB7ZXhwZWN0ZWR9IGNoYXJhY3RlcnMgbG9uZy5cIixzdHJpbmdQYXR0ZXJuOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBmYWlscyB0byBtYXRjaCB0aGUgcmVxdWlyZWQgcGF0dGVybi5cIixzdHJpbmdDb250YWluczpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBjb250YWluIHRoZSAne2V4cGVjdGVkfScgdGV4dC5cIixcbnN0cmluZ0VudW06XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGRvZXMgbm90IG1hdGNoIGFueSBvZiB0aGUgYWxsb3dlZCB2YWx1ZXMuXCIsc3RyaW5nTnVtZXJpYzpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIG51bWVyaWMgc3RyaW5nLlwiLHN0cmluZ0FscGhhOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFscGhhYmV0aWMgc3RyaW5nLlwiLHN0cmluZ0FscGhhbnVtOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFscGhhbnVtZXJpYyBzdHJpbmcuXCIsc3RyaW5nQWxwaGFkYXNoOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFscGhhZGFzaCBzdHJpbmcuXCIsc3RyaW5nSGV4OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgaGV4IHN0cmluZy5cIixzdHJpbmdTaW5nbGVMaW5lOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgc2luZ2xlIGxpbmUgc3RyaW5nLlwiLHN0cmluZ0Jhc2U2NDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIGJhc2U2NCBzdHJpbmcuXCIsXG5udW1iZXI6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSBudW1iZXIuXCIsbnVtYmVyTWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLG51bWJlck1heDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBsZXNzIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfS5cIixudW1iZXJFcXVhbDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLG51bWJlck5vdEVxdWFsOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBjYW4ndCBiZSBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLG51bWJlckludGVnZXI6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gaW50ZWdlci5cIixudW1iZXJQb3NpdGl2ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlci5cIixudW1iZXJOZWdhdGl2ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIG5lZ2F0aXZlIG51bWJlci5cIixcbmFycmF5OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGFycmF5LlwiLGFycmF5RW1wdHk6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3Qgbm90IGJlIGFuIGVtcHR5IGFycmF5LlwiLGFycmF5TWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGNvbnRhaW4gYXQgbGVhc3Qge2V4cGVjdGVkfSBpdGVtcy5cIixhcnJheU1heDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBjb250YWluIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9IGl0ZW1zLlwiLGFycmF5TGVuZ3RoOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGNvbnRhaW4ge2V4cGVjdGVkfSBpdGVtcy5cIixhcnJheUNvbnRhaW5zOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGNvbnRhaW4gdGhlICd7ZXhwZWN0ZWR9JyBpdGVtLlwiLGFycmF5VW5pcXVlOlwiVGhlICd7YWN0dWFsfScgdmFsdWUgaW4gJ3tmaWVsZH0nIGZpZWxkIGRvZXMgbm90IHVuaXF1ZSB0aGUgJ3tleHBlY3RlZH0nIHZhbHVlcy5cIixhcnJheUVudW06XCJUaGUgJ3thY3R1YWx9JyB2YWx1ZSBpbiAne2ZpZWxkfScgZmllbGQgZG9lcyBub3QgbWF0Y2ggYW55IG9mIHRoZSAne2V4cGVjdGVkfScgdmFsdWVzLlwiLFxudHVwbGU6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gYXJyYXkuXCIsdHVwbGVFbXB0eTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBub3QgYmUgYW4gZW1wdHkgYXJyYXkuXCIsdHVwbGVMZW5ndGg6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgY29udGFpbiB7ZXhwZWN0ZWR9IGl0ZW1zLlwiLGJvb2xlYW46XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSBib29sZWFuLlwiLGN1cnJlbmN5OlwiVGhlICd7ZmllbGR9JyBtdXN0IGJlIGEgdmFsaWQgY3VycmVuY3kgZm9ybWF0XCIsZGF0ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIERhdGUuXCIsZGF0ZU1pbjpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfS5cIixkYXRlTWF4OlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9LlwiLGVudW1WYWx1ZTpcIlRoZSAne2ZpZWxkfScgZmllbGQgdmFsdWUgJ3tleHBlY3RlZH0nIGRvZXMgbm90IG1hdGNoIGFueSBvZiB0aGUgYWxsb3dlZCB2YWx1ZXMuXCIsXG5lcXVhbFZhbHVlOlwiVGhlICd7ZmllbGR9JyBmaWVsZCB2YWx1ZSBtdXN0IGJlIGVxdWFsIHRvICd7ZXhwZWN0ZWR9Jy5cIixlcXVhbEZpZWxkOlwiVGhlICd7ZmllbGR9JyBmaWVsZCB2YWx1ZSBtdXN0IGJlIGVxdWFsIHRvICd7ZXhwZWN0ZWR9JyBmaWVsZCB2YWx1ZS5cIixmb3JiaWRkZW46XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGlzIGZvcmJpZGRlbi5cIixmdW5jdGlvbjpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiLGVtYWlsOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgdmFsaWQgZS1tYWlsLlwiLGVtYWlsRW1wdHk6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3Qgbm90IGJlIGVtcHR5LlwiLGVtYWlsTWluOlwiVGhlICd7ZmllbGR9JyBmaWVsZCBsZW5ndGggbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8ge2V4cGVjdGVkfSBjaGFyYWN0ZXJzIGxvbmcuXCIsZW1haWxNYXg6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIGxlbmd0aCBtdXN0IGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB7ZXhwZWN0ZWR9IGNoYXJhY3RlcnMgbG9uZy5cIixcbmx1aG46XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYSB2YWxpZCBjaGVja3N1bSBsdWhuLlwiLG1hYzpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIE1BQyBhZGRyZXNzLlwiLG9iamVjdDpcIlRoZSAne2ZpZWxkfScgbXVzdCBiZSBhbiBPYmplY3QuXCIsb2JqZWN0U3RyaWN0OlwiVGhlIG9iamVjdCAne2ZpZWxkfScgY29udGFpbnMgZm9yYmlkZGVuIGtleXM6ICd7YWN0dWFsfScuXCIsb2JqZWN0TWluUHJvcHM6XCJUaGUgb2JqZWN0ICd7ZmllbGR9JyBtdXN0IGNvbnRhaW4gYXQgbGVhc3Qge2V4cGVjdGVkfSBwcm9wZXJ0aWVzLlwiLG9iamVjdE1heFByb3BzOlwiVGhlIG9iamVjdCAne2ZpZWxkfScgbXVzdCBjb250YWluIHtleHBlY3RlZH0gcHJvcGVydGllcyBhdCBtb3N0LlwiLHVybDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVSTC5cIix1cmxFbXB0eTpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBub3QgYmUgZW1wdHkuXCIsdXVpZDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVVSUQuXCIsXG51dWlkVmVyc2lvbjpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIFVVSUQgdmVyc2lvbiBwcm92aWRlZC5cIixjbGFzc0luc3RhbmNlT2Y6XCJUaGUgJ3tmaWVsZH0nIGZpZWxkIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgdGhlICd7ZXhwZWN0ZWR9JyBjbGFzcy5cIixvYmplY3RJRDpcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhbiB2YWxpZCBPYmplY3RJRFwiLHJlY29yZDpcIlRoZSAne2ZpZWxkfScgbXVzdCBiZSBhbiBPYmplY3QuXCJ9O3IucmVxdWlyZWQ7ci5zdHJpbmc7ci5zdHJpbmdFbXB0eTtyLnN0cmluZ01pbjtyLnN0cmluZ01heDtyLnN0cmluZ0xlbmd0aDtyLnN0cmluZ1BhdHRlcm47ci5zdHJpbmdDb250YWlucztyLnN0cmluZ0VudW07ci5zdHJpbmdOdW1lcmljO3Iuc3RyaW5nQWxwaGE7ci5zdHJpbmdBbHBoYW51bTtyLnN0cmluZ0FscGhhZGFzaDtyLnN0cmluZ0hleDtyLnN0cmluZ1NpbmdsZUxpbmU7ci5zdHJpbmdCYXNlNjQ7ci5udW1iZXI7ci5udW1iZXJNaW47XG5yLm51bWJlck1heDtyLm51bWJlckVxdWFsO3IubnVtYmVyTm90RXF1YWw7ci5udW1iZXJJbnRlZ2VyO3IubnVtYmVyUG9zaXRpdmU7ci5udW1iZXJOZWdhdGl2ZTtyLmFycmF5O3IuYXJyYXlFbXB0eTtyLmFycmF5TWluO3IuYXJyYXlNYXg7ci5hcnJheUxlbmd0aDtyLmFycmF5Q29udGFpbnM7ci5hcnJheVVuaXF1ZTtyLmFycmF5RW51bTtyLnR1cGxlO3IudHVwbGVFbXB0eTtyLnR1cGxlTGVuZ3RoO3IuY3VycmVuY3k7ci5kYXRlO3IuZGF0ZU1pbjtyLmRhdGVNYXg7ci5lbnVtVmFsdWU7ci5lcXVhbFZhbHVlO3IuZXF1YWxGaWVsZDtyLmZvcmJpZGRlbjtyLmVtYWlsO3IuZW1haWxFbXB0eTtyLmVtYWlsTWluO3IuZW1haWxNYXg7ci5sdWhuO3IubWFjO3Iub2JqZWN0O3Iub2JqZWN0U3RyaWN0O3Iub2JqZWN0TWluUHJvcHM7ci5vYmplY3RNYXhQcm9wcztyLnVybDtyLnVybEVtcHR5O3IudXVpZDtyLnV1aWRWZXJzaW9uO3IuY2xhc3NJbnN0YW5jZU9mO3Iub2JqZWN0SUQ7ci5yZWNvcmQ7XG52YXIgcWE9L14oKFtePD4oKVtcXF1cXFxcLiw7Olxcc0BcIl0rKFxcLltePD4oKVtcXF1cXFxcLiw7Olxcc0BcIl0rKSopfChcIi4rXCIpKUAoKFxcW1swLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXF0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvLHJhPS9eXFxTK0BcXFMrXFwuXFxTKyQvLHBhPS9eW18kYS16QS1aXVtfJGEtekEtWjAtOV0qJC8sdGE9L1tcIidcXFxcXFxuXFxyXFx1MjAyOFxcdTIwMjldL2csaWE9L14tP1swLTldXFxkKihcXC5cXGQrKT8kLyxqYT0vXlthLXpBLVpdKyQvLGthPS9eW2EtekEtWjAtOV0rJC8sbGE9L15bYS16QS1aMC05Xy1dKyQvLG1hPS9eWzAtOWEtZkEtRl0rJC8sbmE9L14oPzpbQS1aYS16MC05K1xcXFwvXXs0fSkqKD86W0EtWmEtejAtOStcXFxcL117Mn09PXxbQS1aYS16MC05Ky9dezN9PSk/JC8saGE9L15odHRwcz86XFwvXFwvXFxTKy8sZmE9L14oWzAtOWEtZl17OH0tWzAtOWEtZl17NH0tWzEtNl1bMC05YS1mXXszfS1bMC05YS1mXXs0fS1bMC05YS1mXXsxMn18WzBdezh9LVswXXs0fS1bMF17NH0tWzBdezR9LVswXXsxMn0pJC9pLFxuZWE9L14oKChbYS1mMC05XVthLWYwLTldK1stXSl7NX18KFthLWYwLTldW2EtZjAtOV0rWzpdKXs1fSkoW2EtZjAtOV1bYS1mMC05XSkkKXwoXihbYS1mMC05XVthLWYwLTldW2EtZjAtOV1bYS1mMC05XStbLl0pezJ9KFthLWYwLTldW2EtZjAtOV1bYS1mMC05XVthLWYwLTldKSkkL2ksSSxPLEosUDt0cnl7dmFyIE09KG5ldyBGdW5jdGlvbihcInJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXN5bmMgZnVuY3Rpb24oKXt9KS5jb25zdHJ1Y3RvclwiKSkoKX1jYXRjaChhKXt9ZS5wcm90b3R5cGUudmFsaWRhdGU9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5jb21waWxlKGIpKGEpfTtlLnByb3RvdHlwZS53cmFwUmVxdWlyZWRDaGVja1NvdXJjZUNvZGU9ZnVuY3Rpb24oYSxiLGMsZCl7dmFyIGY9W10saz10aGlzLm9wdHMuY29uc2lkZXJOdWxsQXNBVmFsdWU7dm9pZCAwPT09ayYmKGs9ITEpO3ZhciB1PSEwPT09YS5zY2hlbWEub3B0aW9uYWx8fFwiZm9yYmlkZGVuXCI9PT1hLnNjaGVtYS50eXBlLFxuej1rPyExIT09YS5zY2hlbWEubnVsbGFibGV8fFwiZm9yYmlkZGVuXCI9PT1hLnNjaGVtYS50eXBlOiEwPT09YS5zY2hlbWEub3B0aW9uYWx8fCEwPT09YS5zY2hlbWEubnVsbGFibGV8fFwiZm9yYmlkZGVuXCI9PT1hLnNjaGVtYS50eXBlOyhrP3ZvaWQgMCE9YS5zY2hlbWEuZGVmYXVsdCYmbnVsbCE9YS5zY2hlbWEuZGVmYXVsdDp2b2lkIDAhPWEuc2NoZW1hLmRlZmF1bHQpPyh1PSExLGs/ITE9PT1hLnNjaGVtYS5udWxsYWJsZSYmKHo9ITEpOiEwIT09YS5zY2hlbWEubnVsbGFibGUmJih6PSExKSxcImZ1bmN0aW9uXCI9PT10eXBlb2YgYS5zY2hlbWEuZGVmYXVsdD8oYy5jdXN0b21zW2EuaW5kZXhdfHwoYy5jdXN0b21zW2EuaW5kZXhdPXt9KSxjLmN1c3RvbXNbYS5pbmRleF0uZGVmYXVsdEZuPWEuc2NoZW1hLmRlZmF1bHQsYT1cImNvbnRleHQuY3VzdG9tc1tcIithLmluZGV4K1wiXS5kZWZhdWx0Rm4uY2FsbCh0aGlzLCBjb250ZXh0LnJ1bGVzW1wiK2EuaW5kZXgrXCJdLnNjaGVtYSwgZmllbGQsIHBhcmVudCwgY29udGV4dClcIik6XG5hPUpTT04uc3RyaW5naWZ5KGEuc2NoZW1hLmRlZmF1bHQpLGQ9XCJcXG5cXHRcXHRcXHRcXHR2YWx1ZSA9IFwiK2ErXCI7XFxuXFx0XFx0XFx0XFx0XCIrZCtcIiA9IHZhbHVlO1xcblxcdFxcdFxcdFwiKTpkPXRoaXMubWFrZUVycm9yKHt0eXBlOlwicmVxdWlyZWRcIixhY3R1YWw6XCJ2YWx1ZVwiLG1lc3NhZ2VzOmEubWVzc2FnZXN9KTtmLnB1c2goXCJcXG5cXHRcXHRcXHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgeyBcIisoKHU/XCJcXG4vLyBhbGxvdyB1bmRlZmluZWRcXG5cIjpkKStcIiB9XFxuXFx0XFx0XFx0ZWxzZSBpZiAodmFsdWUgPT09IG51bGwpIHsgXCIpKygoej9cIlxcbi8vIGFsbG93IG51bGxcXG5cIjpkKStcIiB9XFxuXFx0XFx0XFx0XCIpKyhiP1wiZWxzZSB7IFwiK2IrXCIgfVwiOlwiXCIpK1wiXFxuXFx0XFx0XCIpO3JldHVybiBmLmpvaW4oXCJcXG5cIil9O2UucHJvdG90eXBlLmlzTWV0YUtleT1mdW5jdGlvbihhKXtyZXR1cm4gYS5zdGFydHNXaXRoKFwiJCRcIil9O2UucHJvdG90eXBlLnJlbW92ZU1ldGFzS2V5cz1mdW5jdGlvbihhKXt2YXIgYj10aGlzO09iamVjdC5rZXlzKGEpLmZvckVhY2goZnVuY3Rpb24oYyl7Yi5pc01ldGFLZXkoYykmJlxuZGVsZXRlIGFbY119KX07ZS5wcm90b3R5cGUuY29tcGlsZT1mdW5jdGlvbihhKXtmdW5jdGlvbiBiKHUseil7ZC5kYXRhPXU7eiYmei5tZXRhJiYoZC5tZXRhPXoubWV0YSk7cmV0dXJuIGsuY2FsbChjLHUsZCl9aWYobnVsbD09PWF8fFwib2JqZWN0XCIhPT10eXBlb2YgYSl0aHJvdyBFcnJvcihcIkludmFsaWQgc2NoZW1hLlwiKTt2YXIgYz10aGlzLGQ9e2luZGV4OjAsYXN5bmM6ITA9PT1hLiQkYXN5bmMscnVsZXM6W10sZm46W10sY3VzdG9tczp7fSx1dGlsczp7cmVwbGFjZTpzYX19O3RoaXMuY2FjaGUuY2xlYXIoKTtkZWxldGUgYS4kJGFzeW5jO2lmKGQuYXN5bmMmJiFNKXRocm93IEVycm9yKFwiQXN5bmNocm9ub3VzIG1vZGUgaXMgbm90IHN1cHBvcnRlZC5cIik7aWYoITAhPT1hLiQkcm9vdClpZihBcnJheS5pc0FycmF5KGEpKWE9dGhpcy5nZXRSdWxlRnJvbVNjaGVtYShhKS5zY2hlbWE7ZWxzZXt2YXIgZj1PYmplY3QuYXNzaWduKHt9LGEpO2E9e3R5cGU6XCJvYmplY3RcIixzdHJpY3Q6Zi4kJHN0cmljdCxcbnByb3BlcnRpZXM6Zn07dGhpcy5yZW1vdmVNZXRhc0tleXMoZil9Zj1bXCJ2YXIgZXJyb3JzID0gW107XCIsXCJ2YXIgZmllbGQ7XCIsXCJ2YXIgcGFyZW50ID0gbnVsbDtcIixcInZhciBsYWJlbCA9IFwiKyhhLmxhYmVsPydcIicrYS5sYWJlbCsnXCInOlwibnVsbFwiKStcIjtcIl07YT10aGlzLmdldFJ1bGVGcm9tU2NoZW1hKGEpO2YucHVzaCh0aGlzLmNvbXBpbGVSdWxlKGEsZCxudWxsLChkLmFzeW5jP1wiYXdhaXQgXCI6XCJcIikrXCJjb250ZXh0LmZuWyUlSU5ERVglJV0odmFsdWUsIGZpZWxkLCBudWxsLCBlcnJvcnMsIGNvbnRleHQsIGxhYmVsKTtcIixcInZhbHVlXCIpKTtmLnB1c2goXCJpZiAoZXJyb3JzLmxlbmd0aCkge1wiKTtmLnB1c2goXCJcXG5cXHRcXHRcXHRyZXR1cm4gZXJyb3JzLm1hcChlcnIgPT4ge1xcblxcdFxcdFxcdFxcdGlmIChlcnIubWVzc2FnZSkge1xcblxcdFxcdFxcdFxcdFxcdGVyci5tZXNzYWdlID0gY29udGV4dC51dGlscy5yZXBsYWNlKGVyci5tZXNzYWdlLCAvXFxcXHtmaWVsZFxcXFx9L2csIGVyci5sYWJlbCB8fCBlcnIuZmllbGQpO1xcblxcdFxcdFxcdFxcdFxcdGVyci5tZXNzYWdlID0gY29udGV4dC51dGlscy5yZXBsYWNlKGVyci5tZXNzYWdlLCAvXFxcXHtleHBlY3RlZFxcXFx9L2csIGVyci5leHBlY3RlZCk7XFxuXFx0XFx0XFx0XFx0XFx0ZXJyLm1lc3NhZ2UgPSBjb250ZXh0LnV0aWxzLnJlcGxhY2UoZXJyLm1lc3NhZ2UsIC9cXFxce2FjdHVhbFxcXFx9L2csIGVyci5hY3R1YWwpO1xcblxcdFxcdFxcdFxcdH1cXG5cXHRcXHRcXHRcXHRpZighZXJyLmxhYmVsKSBkZWxldGUgZXJyLmxhYmVsXFxuXFx0XFx0XFx0XFx0cmV0dXJuIGVycjtcXG5cXHRcXHRcXHR9KTtcXG5cXHRcXHRcIik7XG5mLnB1c2goXCJ9XCIpO2YucHVzaChcInJldHVybiB0cnVlO1wiKTthPWYuam9pbihcIlxcblwiKTt2YXIgaz1uZXcgKGQuYXN5bmM/TTpGdW5jdGlvbikoXCJ2YWx1ZVwiLFwiY29udGV4dFwiLGEpO3RoaXMub3B0cy5kZWJ1ZyYmY29uc29sZS5sb2codGhpcy5fZm9ybWF0dGVyKFwiLy8gTWFpbiBjaGVjayBmdW5jdGlvblxcblwiK2sudG9TdHJpbmcoKSkpO3RoaXMuY2FjaGUuY2xlYXIoKTtiLmFzeW5jPWQuYXN5bmM7cmV0dXJuIGJ9O2UucHJvdG90eXBlLmNvbXBpbGVSdWxlPWZ1bmN0aW9uKGEsYixjLGQsZil7dmFyIGs9W10sdT10aGlzLmNhY2hlLmdldChhLnNjaGVtYSk7dT8oYT11LGEuY3ljbGU9ITAsYS5jeWNsZVN0YWNrPVtdLGsucHVzaCh0aGlzLndyYXBSZXF1aXJlZENoZWNrU291cmNlQ29kZShhLFwiXFxuXFx0XFx0XFx0XFx0dmFyIHJ1bGUgPSBjb250ZXh0LnJ1bGVzW1wiK2EuaW5kZXgrXCJdO1xcblxcdFxcdFxcdFxcdGlmIChydWxlLmN5Y2xlU3RhY2suaW5kZXhPZih2YWx1ZSkgPT09IC0xKSB7XFxuXFx0XFx0XFx0XFx0XFx0cnVsZS5jeWNsZVN0YWNrLnB1c2godmFsdWUpO1xcblxcdFxcdFxcdFxcdFxcdFwiK1xuZC5yZXBsYWNlKC8lJUlOREVYJSUvZyxhLmluZGV4KStcIlxcblxcdFxcdFxcdFxcdFxcdHJ1bGUuY3ljbGVTdGFjay5wb3AodmFsdWUpO1xcblxcdFxcdFxcdFxcdH1cXG5cXHRcXHRcXHRcIixiLGYpKSk6KHRoaXMuY2FjaGUuc2V0KGEuc2NoZW1hLGEpLGEuaW5kZXg9Yi5pbmRleCxiLnJ1bGVzW2IuaW5kZXhdPWEsdT1udWxsIT1jP2M6XCIkJHJvb3RcIixiLmluZGV4KyssYz1hLnJ1bGVGdW5jdGlvbi5jYWxsKHRoaXMsYSxjLGIpLGMuc291cmNlPWMuc291cmNlLnJlcGxhY2UoLyUlSU5ERVglJS9nLGEuaW5kZXgpLGM9bmV3IChiLmFzeW5jP006RnVuY3Rpb24pKFwidmFsdWVcIixcImZpZWxkXCIsXCJwYXJlbnRcIixcImVycm9yc1wiLFwiY29udGV4dFwiLFwibGFiZWxcIixjLnNvdXJjZSksYi5mblthLmluZGV4XT1jLmJpbmQodGhpcyksay5wdXNoKHRoaXMud3JhcFJlcXVpcmVkQ2hlY2tTb3VyY2VDb2RlKGEsZC5yZXBsYWNlKC8lJUlOREVYJSUvZyxhLmluZGV4KSxiLGYpKSxrLnB1c2godGhpcy5tYWtlQ3VzdG9tVmFsaWRhdG9yKHt2TmFtZTpmLFxucGF0aDp1LHNjaGVtYTphLnNjaGVtYSxjb250ZXh0OmIsbWVzc2FnZXM6YS5tZXNzYWdlcyxydWxlSW5kZXg6YS5pbmRleH0pKSx0aGlzLm9wdHMuZGVidWcmJmNvbnNvbGUubG9nKHRoaXMuX2Zvcm1hdHRlcihcIi8vIENvbnRleHQuZm5bXCIrYS5pbmRleCtcIl1cXG5cIitjLnRvU3RyaW5nKCkpKSk7cmV0dXJuIGsuam9pbihcIlxcblwiKX07ZS5wcm90b3R5cGUuZ2V0UnVsZUZyb21TY2hlbWE9ZnVuY3Rpb24oYSl7YT10aGlzLnJlc29sdmVUeXBlKGEpO3ZhciBiPXRoaXMuYWxpYXNlc1thLnR5cGVdO2ImJihkZWxldGUgYS50eXBlLGE9QShhLGIse3NraXBJZkV4aXN0OiEwfSkpO2I9dGhpcy5ydWxlc1thLnR5cGVdO2lmKCFiKXRocm93IEVycm9yKFwiSW52YWxpZCAnXCIrYS50eXBlK1wiJyB0eXBlIGluIHZhbGlkYXRvciBzY2hlbWEuXCIpO3JldHVybnttZXNzYWdlczpPYmplY3QuYXNzaWduKHt9LHRoaXMubWVzc2FnZXMsYS5tZXNzYWdlcyksc2NoZW1hOkEoYSx0aGlzLmRlZmF1bHRzW2EudHlwZV0sXG57c2tpcElmRXhpc3Q6ITB9KSxydWxlRnVuY3Rpb246Yn19O2UucHJvdG90eXBlLnBhcnNlU2hvcnRIYW5kPWZ1bmN0aW9uKGEpe2E9YS5zcGxpdChcInxcIikubWFwKGZ1bmN0aW9uKGQpe3JldHVybiBkLnRyaW0oKX0pO3ZhciBiPWFbMF07dmFyIGM9Yi5lbmRzV2l0aChcIltdXCIpP3RoaXMuZ2V0UnVsZUZyb21TY2hlbWEoe3R5cGU6XCJhcnJheVwiLGl0ZW1zOmIuc2xpY2UoMCwtMil9KS5zY2hlbWE6e3R5cGU6YVswXX07YS5zbGljZSgxKS5tYXAoZnVuY3Rpb24oZCl7dmFyIGY9ZC5pbmRleE9mKFwiOlwiKTtpZigtMSE9PWYpe3ZhciBrPWQuc3Vic3RyKDAsZikudHJpbSgpO2Q9ZC5zdWJzdHIoZisxKS50cmltKCk7XCJ0cnVlXCI9PT1kfHxcImZhbHNlXCI9PT1kP2Q9XCJ0cnVlXCI9PT1kOk51bWJlci5pc05hTihOdW1iZXIoZCkpfHwoZD1OdW1iZXIoZCkpO2Nba109ZH1lbHNlIGQuc3RhcnRzV2l0aChcIm5vLVwiKT9jW2Quc2xpY2UoMyldPSExOmNbZF09ITB9KTtyZXR1cm4gY307ZS5wcm90b3R5cGUubWFrZUVycm9yPVxuZnVuY3Rpb24oYSl7dmFyIGI9YS50eXBlLGM9YS5maWVsZCxkPWEuZXhwZWN0ZWQsZj1hLmFjdHVhbCxrPXt0eXBlOidcIicrYisnXCInLG1lc3NhZ2U6J1wiJythLm1lc3NhZ2VzW2JdKydcIid9O2suZmllbGQ9Yz8nXCInK2MrJ1wiJzpcImZpZWxkXCI7bnVsbCE9ZCYmKGsuZXhwZWN0ZWQ9ZCk7bnVsbCE9ZiYmKGsuYWN0dWFsPWYpO2subGFiZWw9XCJsYWJlbFwiO3JldHVyblwiZXJyb3JzLnB1c2goeyBcIitPYmplY3Qua2V5cyhrKS5tYXAoZnVuY3Rpb24odSl7cmV0dXJuIHUrXCI6IFwiK2tbdV19KS5qb2luKFwiLCBcIikrXCIgfSk7XCJ9O2UucHJvdG90eXBlLm1ha2VDdXN0b21WYWxpZGF0b3I9ZnVuY3Rpb24oYSl7dmFyIGI9YS52TmFtZTt2b2lkIDA9PT1iJiYoYj1cInZhbHVlXCIpO3ZhciBjPWEuZm5OYW1lO3ZvaWQgMD09PWMmJihjPVwiY3VzdG9tXCIpO3ZhciBkPWEucnVsZUluZGV4LGY9YS5wYXRoLGs9YS5zY2hlbWEsdT1hLmNvbnRleHQsej1hLm1lc3NhZ2VzO2E9XCJydWxlXCIrZDt2YXIgQz1cImZuQ3VzdG9tRXJyb3JzXCIrXG5kO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGtbY10pe3UuY3VzdG9tc1tkXT8odS5jdXN0b21zW2RdLm1lc3NhZ2VzPXosdS5jdXN0b21zW2RdLnNjaGVtYT1rKTp1LmN1c3RvbXNbZF09e21lc3NhZ2VzOnosc2NoZW1hOmt9O2lmKHRoaXMub3B0cy51c2VOZXdDdXN0b21DaGVja2VyRnVuY3Rpb24pcmV0dXJuXCJcXG4gICAgICAgICAgICAgICBcXHRcXHRjb25zdCBcIithK1wiID0gY29udGV4dC5jdXN0b21zW1wiK2QrXCJdO1xcblxcdFxcdFxcdFxcdFxcdGNvbnN0IFwiK0MrXCIgPSBbXTtcXG5cXHRcXHRcXHRcXHRcXHRcIitiK1wiID0gXCIrKHUuYXN5bmM/XCJhd2FpdCBcIjpcIlwiKSthK1wiLnNjaGVtYS5cIitjK1wiLmNhbGwodGhpcywgXCIrYitcIiwgXCIrQytcIiAsIFwiK2ErJy5zY2hlbWEsIFwiJytmKydcIiwgcGFyZW50LCBjb250ZXh0KTtcXG5cXHRcXHRcXHRcXHRcXHRpZiAoQXJyYXkuaXNBcnJheSgnK0MrXCIgKSkge1xcbiAgICAgICAgICAgICAgICAgIFxcdFxcdFwiK0MrXCIgLmZvckVhY2goZXJyID0+IGVycm9ycy5wdXNoKE9iamVjdC5hc3NpZ24oeyBtZXNzYWdlOiBcIitcbmErXCIubWVzc2FnZXNbZXJyLnR5cGVdLCBmaWVsZCB9LCBlcnIpKSk7XFxuXFx0XFx0XFx0XFx0XFx0fVxcblxcdFxcdFxcdFxcdFwiO2s9XCJyZXNfXCIrYTtyZXR1cm5cIlxcblxcdFxcdFxcdFxcdGNvbnN0IFwiK2ErXCIgPSBjb250ZXh0LmN1c3RvbXNbXCIrZCtcIl07XFxuXFx0XFx0XFx0XFx0Y29uc3QgXCIraytcIiA9IFwiKyh1LmFzeW5jP1wiYXdhaXQgXCI6XCJcIikrYStcIi5zY2hlbWEuXCIrYytcIi5jYWxsKHRoaXMsIFwiK2IrXCIsIFwiK2ErJy5zY2hlbWEsIFwiJytmKydcIiwgcGFyZW50LCBjb250ZXh0KTtcXG5cXHRcXHRcXHRcXHRpZiAoQXJyYXkuaXNBcnJheSgnK2srXCIpKSB7XFxuXFx0XFx0XFx0XFx0XFx0XCIraytcIi5mb3JFYWNoKGVyciA9PiBlcnJvcnMucHVzaChPYmplY3QuYXNzaWduKHsgbWVzc2FnZTogXCIrYStcIi5tZXNzYWdlc1tlcnIudHlwZV0sIGZpZWxkIH0sIGVycikpKTtcXG5cXHRcXHRcXHRcXHR9XFxuXFx0XFx0XCJ9cmV0dXJuXCJcIn07ZS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKGEsYil7dGhpcy5ydWxlc1thXT1ifTtlLnByb3RvdHlwZS5hZGRNZXNzYWdlPVxuZnVuY3Rpb24oYSxiKXt0aGlzLm1lc3NhZ2VzW2FdPWJ9O2UucHJvdG90eXBlLmFsaWFzPWZ1bmN0aW9uKGEsYil7aWYodGhpcy5ydWxlc1thXSl0aHJvdyBFcnJvcihcIkFsaWFzIG5hbWUgbXVzdCBub3QgYmUgYSBydWxlIG5hbWVcIik7dGhpcy5hbGlhc2VzW2FdPWJ9O2UucHJvdG90eXBlLnBsdWdpbj1mdW5jdGlvbihhKXtpZihcImZ1bmN0aW9uXCIhPT10eXBlb2YgYSl0aHJvdyBFcnJvcihcIlBsdWdpbiBmbiB0eXBlIG11c3QgYmUgZnVuY3Rpb25cIik7cmV0dXJuIGEodGhpcyl9O2UucHJvdG90eXBlLnJlc29sdmVUeXBlPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7aWYoXCJzdHJpbmdcIj09PXR5cGVvZiBhKWE9dGhpcy5wYXJzZVNob3J0SGFuZChhKTtlbHNlIGlmKEFycmF5LmlzQXJyYXkoYSkpe2lmKDA9PT1hLmxlbmd0aCl0aHJvdyBFcnJvcihcIkludmFsaWQgc2NoZW1hLlwiKTthPXt0eXBlOlwibXVsdGlcIixydWxlczphfTthLnJ1bGVzLm1hcChmdW5jdGlvbih1KXtyZXR1cm4gYi5nZXRSdWxlRnJvbVNjaGVtYSh1KX0pLmV2ZXJ5KGZ1bmN0aW9uKHUpe3JldHVybiEwPT09XG51LnNjaGVtYS5vcHRpb25hbH0pJiYoYS5vcHRpb25hbD0hMCk7dmFyIGM9dGhpcy5vcHRzLmNvbnNpZGVyTnVsbEFzQVZhbHVlPyExOiEwO2EucnVsZXMubWFwKGZ1bmN0aW9uKHUpe3JldHVybiBiLmdldFJ1bGVGcm9tU2NoZW1hKHUpfSkuZXZlcnkoZnVuY3Rpb24odSl7cmV0dXJuIHUuc2NoZW1hLm51bGxhYmxlPT09Y30pJiYoYS5udWxsYWJsZT1jKX1pZihhLiQkdHlwZSl7dmFyIGQ9dGhpcy5nZXRSdWxlRnJvbVNjaGVtYShhLiQkdHlwZSkuc2NoZW1hO2RlbGV0ZSBhLiQkdHlwZTt2YXIgZj1PYmplY3QuYXNzaWduKHt9LGEpLGs7Zm9yKGsgaW4gYSlkZWxldGUgYVtrXTtBKGEsZCx7c2tpcElmRXhpc3Q6ITB9KTthLnByb3BzPWZ9cmV0dXJuIGF9O2UucHJvdG90eXBlLm5vcm1hbGl6ZT1mdW5jdGlvbihhKXt2YXIgYj10aGlzLGM9dGhpcy5yZXNvbHZlVHlwZShhKTt0aGlzLmFsaWFzZXNbYy50eXBlXSYmKGM9QShjLHRoaXMubm9ybWFsaXplKHRoaXMuYWxpYXNlc1tjLnR5cGVdKSxcbntza2lwSWZFeGlzdHM6ITB9KSk7Yz1BKGMsdGhpcy5kZWZhdWx0c1tjLnR5cGVdLHtza2lwSWZFeGlzdDohMH0pO2lmKFwibXVsdGlcIj09PWMudHlwZSlyZXR1cm4gYy5ydWxlcz1jLnJ1bGVzLm1hcChmdW5jdGlvbihkKXtyZXR1cm4gYi5ub3JtYWxpemUoZCl9KSxjLm9wdGlvbmFsPWMucnVsZXMuZXZlcnkoZnVuY3Rpb24oZCl7cmV0dXJuITA9PT1kLm9wdGlvbmFsfSksYztpZihcImFycmF5XCI9PT1jLnR5cGUpcmV0dXJuIGMuaXRlbXM9dGhpcy5ub3JtYWxpemUoYy5pdGVtcyksYztcIm9iamVjdFwiPT09Yy50eXBlJiZjLnByb3BzJiZPYmplY3QuZW50cmllcyhjLnByb3BzKS5mb3JFYWNoKGZ1bmN0aW9uKGQpe3JldHVybiBjLnByb3BzW2RbMF1dPWIubm9ybWFsaXplKGRbMV0pfSk7XCJvYmplY3RcIj09PXR5cGVvZiBhJiYoYS50eXBlPyhhPXRoaXMubm9ybWFsaXplKGEudHlwZSksQShjLGEse3NraXBJZkV4aXN0czohMH0pKTpPYmplY3QuZW50cmllcyhhKS5mb3JFYWNoKGZ1bmN0aW9uKGQpe3JldHVybiBjW2RbMF1dPVxuYi5ub3JtYWxpemUoZFsxXSl9KSk7cmV0dXJuIGN9O3JldHVybiBlfVwib2JqZWN0XCI9PT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9SCgpOlwiZnVuY3Rpb25cIj09PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKEgpOihHPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgZ2xvYmFsVGhpcz9nbG9iYWxUaGlzOkd8fHNlbGYsRy5GYXN0ZXN0VmFsaWRhdG9yPUgoKSlcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuICpcbiAqIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG5leHBvcnQgbGV0IGVsZW1lbnRTY2hlbWEgPSB7XG4gICAgdHlwZTogJ3N0cmluZycsXG4gICAgb3B0aW9uYWw6IHRydWUsXG4gICAgZGVmYXVsdDogJ2lucHV0JyxcbiAgICBsb3dlcmNhc2U6IHRydWUsXG4gICAgZW51bTogW1xuICAgICAgICAnaW5wdXQnLFxuICAgICAgICAndGV4dGFyZWEnLFxuICAgICAgICAnc2VsZWN0JyxcbiAgICAgICAgJ2RpdicsXG4gICAgICAgICdocicsXG4gICAgICAgICdicicsXG4gICAgICAgICdoMScsXG4gICAgICAgICdoMicsXG4gICAgICAgICdoMycsXG4gICAgICAgICdoNCcsXG4gICAgICAgICdoNScsXG4gICAgICAgICdoNicsXG4gICAgXSxcbn07XG5cbmV4cG9ydCBsZXQgaW5wdXRUeXBlU2NoZW1hID0ge1xuICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgIGRlZmF1bHQ6ICd0ZXh0JyxcbiAgICBsb3dlcmNhc2U6IHRydWUsXG4gICAgZW51bTogW1xuICAgICAgICAnYnV0dG9uJyxcbiAgICAgICAgJ2NoZWNrYm94JyxcbiAgICAgICAgJ2NvbG9yJyxcbiAgICAgICAgJ2RhdGUnLFxuICAgICAgICAnZGF0ZXRpbWUtbG9jYWwnLFxuICAgICAgICAnZW1haWwnLFxuICAgICAgICAnZmlsZScsXG4gICAgICAgICdoaWRkZW4nLFxuICAgICAgICAnaW1hZ2UnLFxuICAgICAgICAnbW9udGgnLFxuICAgICAgICAnbnVtYmVyJyxcbiAgICAgICAgJ3Bhc3N3b3JkJyxcbiAgICAgICAgJ3JhZGlvJyxcbiAgICAgICAgJ3JhbmdlJyxcbiAgICAgICAgJ3Jlc2V0JyxcbiAgICAgICAgJ3NlYXJjaCcsXG4gICAgICAgICdzdWJtaXQnLFxuICAgICAgICAndGVsJyxcbiAgICAgICAgJ3RleHQnLFxuICAgICAgICAndGltZScsXG4gICAgICAgICd1cmwnLFxuICAgICAgICAnd2VlaycsXG4gICAgXSxcbn07XG5cbmV4cG9ydCBjb25zdCBjb250cm9sU2NoZW1hID0ge1xuICAgICQkcm9vdDogdHJ1ZSxcbiAgICAvLyAgICQkc3RyaWN0OiAncmVtb3ZlJyxcblxuICAgIHR5cGU6ICdvYmplY3QnLFxuICAgIHByb3BzOiB7XG4gICAgICAgIGVsZW1lbnQ6IGVsZW1lbnRTY2hlbWEsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgLy8gaHR0cHM6Ly93d3cuZG9mYWN0b3J5LmNvbS9odG1sL2lucHV0LWF0dHJpYnV0ZXNcbiAgICAgICAgICAgIHByb3BzOiB7XG4gICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgIHR5cGU6IGlucHV0VHlwZVNjaGVtYSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogeyB0eXBlOiAnYW55Jywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBpZDogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBjbGFzczogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBzdHlsZTogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICB0aXRsZTogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBhdXRvY29tcGxldGU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ29uJyB8ICdvZmYnXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZvcm06IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgZm9ybWFjdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBmb3JtdGFyZ2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGZvcm1lbmN0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGZvcm1tZXRob2Q6IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgZm9ybW5vdmFsaWRhdGU6IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgYWNjZXB0OiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHBhdHRlcm46IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgbGlzdDogeyB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBkaXJuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGxhbmc6IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG5cbiAgICAgICAgICAgICAgICByZXF1aXJlZDogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHk6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSwgY29udmVydDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGRpc2FibGVkOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUsIGNvbnZlcnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBjaGVja2VkOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUsIGNvbnZlcnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSwgY29udmVydDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGF1dG9mb2N1czogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgbXVsdGlwbGU6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSwgY29udmVydDogdHJ1ZSB9LFxuXG4gICAgICAgICAgICAgICAgdGFiaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgbWF4bGVuZ3RoOiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSwgY29udmVydDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHNpemU6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgd2lkdGg6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSwgY29udmVydDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIG1pbjogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUsIGNvbnZlcnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBtYXg6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgc3RlcDogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUsIGNvbnZlcnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBjb2xzOiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSwgY29udmVydDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHJvd3M6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlLCBjb252ZXJ0OiB0cnVlIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBsYWJlbDoge1xuICAgICAgICAgICAgdHlwZTogJ211bHRpJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3Nlczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdmFsaWRhdGlvbjoge1xuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHByb3BzOiB7XG4gICAgICAgICAgICAgICAgZW51bToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGxvd2VyY2FzZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgbWluOiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIG1heDogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBjb250YWluczogeyB0eXBlOiAnYW55Jywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBlcXVhbDogeyB0eXBlOiAnYW55Jywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBub3RFcXVhbDogeyB0eXBlOiAnYW55Jywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBwb3NpdGl2ZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgbmVnYXRpdmU6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGludGVnZXI6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIG1pblByb3BzOiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSwgcG9zaXRpdmU6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBtYXhQcm9wczogeyB0eXBlOiAnbnVtYmVyJywgb3B0aW9uYWw6IHRydWUsIHBvc2l0aXZlOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgYWxwaGFudW06IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGFscGhhZGFzaDogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgaGV4OiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBzaW5nbGVMaW5lOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBiYXNlNjQ6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGxvd2VyY2FzZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgdXBwZXJjYXNlOiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBsb2NhbGVMb3dlcmNhc2U6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGxvY2FsZVVwcGVyY2FzZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgcGFkU3RhcnQ6IHsgdHlwZTogJ251bWJlcicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgcGFkRW5kOiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHBhZFN0YXJ0OiB7IHR5cGU6ICdudW1iZXInLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHRyaW1MZWZ0OiB7IHR5cGU6ICdib29sZWFuJywgb3B0aW9uYWw6IHRydWUgfSxcbiAgICAgICAgICAgICAgICB0cmltUmlnaHQ6IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHRyaW06IHsgdHlwZTogJ2Jvb2xlYW4nLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZTogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdtdWx0aScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYW55JyB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdhbnknLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2hlY2tlZDogeyB0eXBlOiAnYm9vbGVhbicsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIGNvbnRlbnQ6IHsgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG4gICAgICAgIGNsYXNzZXM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICBkZWZhdWx0OiBbJ2NvbC1zbS0xMiddLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpdGVtczogJ3N0cmluZycsXG4gICAgICAgIH0sXG4gICAgICAgIG9uQ2hhbmdlOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgIHByb3BzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHR5cGU6ICdhbnknLCBvcHRpb25hbDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtdWx0aScsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3sgdHlwZTogJ29iamVjdCcgfSwgeyB0eXBlOiAnZnVuY3Rpb24nIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBvbkNoYW5nZVJlc2V0czoge1xuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHt9LFxuICAgICAgICB9LFxuICAgICAgICBjcmVhdGlvbk1ldGhvZDoge1xuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGRlZmF1bHQ6ICdub3JtYWwnLFxuICAgICAgICB9LFxuICAgIH0sXG59O1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gKiBcbiAqIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG4vLyBpc3RhbmJ1bCBpZ25vcmUgbmV4dFxuY29uc3QgaXNPYmplY3QgPSBvYmogPT4ge1xuICBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGwpIHtcbiAgICBpZiAodHlwZW9mIE9iamVjdC5nZXRQcm90b3R5cGVPZiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25zdCBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKVxuICAgICAgcmV0dXJuIHByb3RvdHlwZSA9PT0gT2JqZWN0LnByb3RvdHlwZSB8fCBwcm90b3R5cGUgPT09IG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCJcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG5leHBvcnQgY29uc3QgbWVyZ2UgPSAoLi4ub2JqZWN0cykgPT5cbiAgb2JqZWN0cy5yZWR1Y2UoKHJlc3VsdCwgY3VycmVudCkgPT4ge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGN1cnJlbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBcIkFyZ3VtZW50cyBwcm92aWRlZCB0byB0cy1kZWVwbWVyZ2UgbXVzdCBiZSBvYmplY3RzLCBub3QgYXJyYXlzLlwiXG4gICAgICApXG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoY3VycmVudCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKFtcIl9fcHJvdG9fX1wiLCBcImNvbnN0cnVjdG9yXCIsIFwicHJvdG90eXBlXCJdLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdFtrZXldKSAmJiBBcnJheS5pc0FycmF5KGN1cnJlbnRba2V5XSkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZS5vcHRpb25zLm1lcmdlQXJyYXlzXG4gICAgICAgICAgPyBtZXJnZS5vcHRpb25zLnVuaXF1ZUFycmF5SXRlbXNcbiAgICAgICAgICAgID8gQXJyYXkuZnJvbShuZXcgU2V0KHJlc3VsdFtrZXldLmNvbmNhdChjdXJyZW50W2tleV0pKSlcbiAgICAgICAgICAgIDogWy4uLnJlc3VsdFtrZXldLCAuLi5jdXJyZW50W2tleV1dXG4gICAgICAgICAgOiBjdXJyZW50W2tleV1cbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QocmVzdWx0W2tleV0pICYmIGlzT2JqZWN0KGN1cnJlbnRba2V5XSkpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZShyZXN1bHRba2V5XSwgY3VycmVudFtrZXldKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPVxuICAgICAgICAgIGN1cnJlbnRba2V5XSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IG1lcmdlLm9wdGlvbnMuYWxsb3dVbmRlZmluZWRPdmVycmlkZXNcbiAgICAgICAgICAgICAgPyBjdXJyZW50W2tleV1cbiAgICAgICAgICAgICAgOiByZXN1bHRba2V5XVxuICAgICAgICAgICAgOiBjdXJyZW50W2tleV1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9LCB7fSlcblxuY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGFsbG93VW5kZWZpbmVkT3ZlcnJpZGVzOiB0cnVlLFxuICBtZXJnZUFycmF5czogdHJ1ZSxcbiAgdW5pcXVlQXJyYXlJdGVtczogdHJ1ZVxufVxuXG5tZXJnZS5vcHRpb25zID0gZGVmYXVsdE9wdGlvbnNcblxubWVyZ2Uud2l0aE9wdGlvbnMgPSAob3B0aW9ucywgLi4ub2JqZWN0cykgPT4ge1xuICBtZXJnZS5vcHRpb25zID0ge1xuICAgIC4uLmRlZmF1bHRPcHRpb25zLFxuICAgIC4uLm9wdGlvbnNcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdCA9IG1lcmdlKC4uLm9iamVjdHMpXG5cbiAgbWVyZ2Uub3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zXG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gKlxuICogVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG5cbmV4cG9ydCBsZXQgZm9ybUlucHV0VHlwZXMgPSBbJ2lucHV0JywgJ3NlbGVjdCcsICd0ZXh0YXJlYSddO1xuXG5jb25zdCBtYWdpY1NwbGl0ID1cbiAgL15bYS16w6Atw7bDuC3Dv10rfFtBLVrDgC3DlsOYLcOfXVthLXrDoC3DtsO4LcO/XSt8W2EtesOgLcO2w7gtw79dK3xbMC05XSt8W0EtWsOALcOWw5gtw59dKyg/IVthLXrDoC3DtsO4LcO/XSkvZztcblxuLyoqXG4gKiBDYXBpdGFsaXNlcyBhIHNpbmdsZSB3b3JkXG4gKiBAcmV0dXJucyB0aGUgd29yZCB3aXRoIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gdXBwZXJjYXNlIGFuZCB0aGUgcmVzdCBpbiBsb3dlcmNhc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhcGl0YWxpc2VXb3JkKHN0cmluZykge1xuICBjb25zdCBtYXRjaCA9IHN0cmluZy5tYXRjaEFsbChtYWdpY1NwbGl0KS5uZXh0KCkudmFsdWU7XG4gIGNvbnN0IGZpcnN0TGV0dGVySW5kZXggPSBtYXRjaCA/IG1hdGNoLmluZGV4IDogMDtcbiAgcmV0dXJuIChcbiAgICBzdHJpbmcuc2xpY2UoMCwgZmlyc3RMZXR0ZXJJbmRleCArIDEpLnRvVXBwZXJDYXNlKCkgK1xuICAgIHN0cmluZy5zbGljZShmaXJzdExldHRlckluZGV4ICsgMSkudG9Mb3dlckNhc2UoKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGFiZWxUZXh0KGNvbnRyb2wpIHtcbiAgbGV0IGxhYmVsO1xuICBpZiAoY29udHJvbC5sYWJlbCkge1xuICAgIGxhYmVsID0gY29udHJvbC5sYWJlbC50ZXh0IHx8IGNvbnRyb2wubGFiZWw7XG4gIH0gZWxzZSB7XG4gICAgbGFiZWwgPSBjYXBpdGFsaXNlV29yZChjb250cm9sLmF0dHJpYnV0ZXMubmFtZSk7XG4gIH1cblxuICByZXR1cm4gbGFiZWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG59XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiAqXG4gKiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKi9cblxuaW1wb3J0IFZhbGlkYXRvciBmcm9tICdmYXN0ZXN0LXZhbGlkYXRvcic7XG5pbXBvcnQgeyBjb250cm9sU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgbWVyZ2UgfSBmcm9tICcuL21lcmdlJztcbmltcG9ydCB7IGNsb25lLCBsYWJlbFRleHQsIGZvcm1JbnB1dFR5cGVzIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCB2ID0gbmV3IFZhbGlkYXRvcih7XG4gICAgbWVzc2FnZXM6IHtcbiAgICAgICAgLy8gUmVnaXN0ZXIgb3VyIG5ldyBlcnJvciBtZXNzYWdlIHRleHRcbiAgICAgICAgY29sb3I6IFwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyISBBY3R1YWw6IHthY3R1YWx9XCIsXG4gICAgICAgIG1vbnRoOiBcIlRoZSAne2ZpZWxkfScgZmllbGQgbXVzdCBiZSBhIHZhbGlkIG1vbnRoISBBY3R1YWw6IHthY3R1YWx9XCIsXG4gICAgICAgIHRpbWU6IFwiVGhlICd7ZmllbGR9JyBmaWVsZCBtdXN0IGJlIGEgdmFsaWQgdGltZSEgQWN0dWFsOiB7YWN0dWFsfVwiLFxuICAgIH0sXG59KTtcblxudi5hZGQoJ2NvbG9yJywgZnVuY3Rpb24gKHsgc2NoZW1hLCBtZXNzYWdlcyB9LCBwYXRoLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBgXG4gICAgICAgICAgICBmdW5jdGlvbiBpc0NvbG9yKHN0ckNvbG9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcyA9IG5ldyBPcHRpb24oKS5zdHlsZTtcbiAgICAgICAgICAgICAgICBzLmNvbG9yID0gc3RyQ29sb3I7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMuY29sb3IgIT09ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCAhaXNDb2xvcih2YWx1ZSkgKXtcbiAgICAgICAgICAgICAgICAke3RoaXMubWFrZUVycm9yKHsgdHlwZTogJ2NvbG9yJywgYWN0dWFsOiAndmFsdWUnLCBtZXNzYWdlcyB9KX1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICBgLFxuICAgIH07XG59KTtcblxudi5hZGQoJ21vbnRoJywgZnVuY3Rpb24gKHsgc2NoZW1hLCBtZXNzYWdlcyB9LCBwYXRoLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBgICAgICAgICBcbiAgICAgICAgbGV0IG1vbnRocyA9IFtdLCBkLCBzO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IDExOyBpKyspIHtcbiAgICAgICAgICAgIGQgPSBuZXcgRGF0ZSgpLnNldE1vbnRoKGkpO1xuICAgICAgICAgICAgcyA9IG5ldyBEYXRlKGQpLnRvTG9jYWxlU3RyaW5nKFwiZW4tVVNcIiwgeyBtb250aDogXCJzaG9ydFwiIH0pO1xuICAgICAgICAgICAgbW9udGhzLnB1c2goXG4gICAgICAgICAgICAgICAgU3RyaW5nKGkgKyAxKSxcbiAgICAgICAgICAgICAgICBuZXcgRGF0ZShkKS50b0xvY2FsZVN0cmluZyhcImVuLVVTXCIsIHsgbW9udGg6IFwibG9uZ1wiIH0pLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgcy50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNNb250aChtKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9udGhzLmluZGV4T2YoU3RyaW5nKG0pLnRvTG93ZXJDYXNlKCkpID4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIGlzTW9udGgodmFsdWUpPT09ZmFsc2UgKXtcbiAgICAgICAgICAgICR7dGhpcy5tYWtlRXJyb3IoeyB0eXBlOiAnbW9udGgnLCBhY3R1YWw6ICd2YWx1ZScsIG1lc3NhZ2VzIH0pfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO2AsXG4gICAgfTtcbn0pO1xuXG52LmFkZCgndGltZScsIGZ1bmN0aW9uICh7IHNjaGVtYSwgbWVzc2FnZXMgfSwgcGF0aCwgY29udGV4dCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogYCAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIGlzVGltZShzdHIpIHtcblxuICAgICAgICAgICAgbGV0IG51bVBhdCA9IC9eWzAtOV0rJC87XG4gICAgICAgICAgICBsZXQgbnVtUGF0QU1QTSA9IC9eKFtcXFxcLmFwbTAtOV0rKSQvaTtcbiAgICAgICAgICAgIGxldCBhcnIgPSBzdHIuc3BsaXQoLyg6fFxcXFxzKykvKS5maWx0ZXIoKHMpID0+IC9eW146XFxcXHNdKyQvLnRlc3QocykpO1xuICAgICAgICBcbiAgICAgICAgICAgIGlmIChudW1QYXQudGVzdChhcnJbMF0pID09PSBmYWxzZSB8fCBOdW1iZXIoYXJyWzBdKSA+PSAyMykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICBpZiAobnVtUGF0LnRlc3QoYXJyWzFdKSA9PT0gZmFsc2UgfHwgTnVtYmVyKGFyclsxXSkgPj0gNTkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgXG4gICAgICAgICAgICBpZiAoYXJyWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bVBhdEFNUE0udGVzdChhcnJbMl0pID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChudW1QYXQudGVzdChhcnJbMl0pICYmIE51bWJlcihhcnJbMl0pID49IDU5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhcnJbM10gJiYgbnVtUGF0QU1QTS50ZXN0KGFyclsyXSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBpc1RpbWUodmFsdWUpPT09ZmFsc2UgKXtcbiAgICAgICAgICAgICR7dGhpcy5tYWtlRXJyb3IoeyB0eXBlOiAndGltZScsIGFjdHVhbDogJ3ZhbHVlJywgbWVzc2FnZXMgfSl9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7YCxcbiAgICB9O1xufSk7XG5cbmV4cG9ydCBjb25zdCB2YWxpZGF0aW9uVHlwZXMgPSB7XG4gICAgZGF0ZTogJ2RhdGUnLFxuICAgICdkYXRldGltZS1sb2NhbCc6ICdkYXRlJyxcbiAgICBlbWFpbDogJ2VtYWlsJyxcbiAgICBudW1iZXI6ICdudW1iZXInLFxuICAgIHVybDogJ3VybCcsXG4gICAgcGFzc3dvcmQ6ICdzdHJpbmcnLFxuICAgIHRleHQ6ICdzdHJpbmcnLFxuICAgIGNvbG9yOiAnY29sb3InLFxuICAgIG1vbnRoOiAnbW9udGgnLFxuICAgIHRpbWU6ICd0aW1lJyxcbiAgICAvLyBidXR0b246IFwiXCIsXG4gICAgLy8gY2hlY2tib3g6IFwiXCIsXG4gICAgLy8gZmlsZTogXCJcIixcbiAgICAvLyBoaWRkZW46IFwiXCIsXG4gICAgLy8gaW1hZ2U6IFwiXCIsXG4gICAgLy8gcmFkaW86IFwiXCIsXG4gICAgLy8gcmFuZ2U6IFwiXCIsXG4gICAgLy8gcmVzZXQ6IFwiXCIsXG4gICAgLy8gc2VhcmNoOiBcIlwiLFxuICAgIC8vIHN1Ym1pdDogXCJcIixcbiAgICAvLyB0ZWw6IFwiXCIsXG4gICAgLy8gd2VlazogXCJcIixcbn07XG5cbmZ1bmN0aW9uIHZhbGlkYXRlKHZhbCwgc2NoZW1hLCBlcnJvclByZWZpeCA9ICcnLCB0aHJvd0Vycm9yID0gdHJ1ZSkge1xuICAgIGNvbnN0IGNoZWNrID0gdi5jb21waWxlKHNjaGVtYSk7XG4gICAgY29uc3QgaXNWYWxpZCA9IGNoZWNrKHZhbCk7XG5cbiAgICBpZiAoaXNWYWxpZCAhPT0gdHJ1ZSkge1xuICAgICAgICBsZXQgbWVzc2FnZSA9XG4gICAgICAgICAgICAnXFxuJyArIGVycm9yUHJlZml4ICsgaXNWYWxpZC5tYXAoKG8pID0+IG8ubWVzc2FnZSkuam9pbignXFxuXFx0Jyk7XG4gICAgICAgIGlmICh0aHJvd0Vycm9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbnRyb2woY29udHJvbCkge1xuICAgIGxldCBzY2hlbWEgPSBjbG9uZShjb250cm9sU2NoZW1hKTtcbiAgICAvLyByYWRpbyAmIHNlbGVjdCBib3hlcyBtdXN0IGhhdmUgYW4gb3B0aW9ucyBrZXlcbiAgICBpZiAoXG4gICAgICAgIGNvbnRyb2wuZWxlbWVudCA9PSAnc2VsZWN0JyB8fFxuICAgICAgICAoY29udHJvbC5lbGVtZW50ID09ICdpbnB1dCcgJiYgY29udHJvbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ3JhZGlvJylcbiAgICApIHtcbiAgICAgICAgc2NoZW1hLnByb3BzLm9wdGlvbnMub3B0aW9uYWwgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBoaWRkZW4gZmllbGRzIG11c3QgaGF2ZSBhIHZhbHVlIGF0dHJcbiAgICBpZiAoY29udHJvbC5lbGVtZW50ID09ICdpbnB1dCcgJiYgY29udHJvbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ2hpZGRlbicpIHtcbiAgICAgICAgc2NoZW1hLnByb3BzLmF0dHJpYnV0ZXMudmFsdWUgPSAnYW55JztcbiAgICB9XG5cbiAgICAvLyBpZiBub3QgY29udHJvbCxcbiAgICAvLyBuYW1lIG5hbWUgYXR0cmlidXRlIG9wdGlvbmFsXG4gICAgLy8gbWFrZSBjb250ZW50IGEgbXVzdFxuICAgIGlmIChmb3JtSW5wdXRUeXBlcy5pbmRleE9mKGNvbnRyb2wuZWxlbWVudCkgPT0gLTEpIHtcbiAgICAgICAgc2NoZW1hLnByb3BzLmF0dHJpYnV0ZXMub3B0aW9uYWwgPSB0cnVlO1xuICAgICAgICBzY2hlbWEucHJvcHMuYXR0cmlidXRlcy5wcm9wcy5uYW1lLm9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgICAgc2NoZW1hLnByb3BzLmNvbnRlbnQub3B0aW9uYWwgPSBmYWxzZTtcbiAgICB9XG4gICAgLy8gdmFsaWRhdGVcbiAgICB2YWxpZGF0ZShjb250cm9sLCBzY2hlbWEsICdDb250cm9sWycgKyBjb250cm9sLmlkeCArICddICcpO1xuICAgIHJldHVybiBzY2hlbWE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbnRyb2xzKGNvbnRyb2xzKSB7XG4gICAgbGV0IGlucHV0TmFtZXMgPSB7fTtcbiAgICBsZXQgaW5wdXRJZHMgPSB7fTtcbiAgICBsZXQgY29udHJvbDtcblxuICAgIGZvciAobGV0IGkgaW4gY29udHJvbHMpIHtcbiAgICAgICAgaSA9IE51bWJlcihpKTtcblxuICAgICAgICBjb250cm9sID0gY29udHJvbHNbaV07XG5cbiAgICAgICAgLy8gdmFsaWRhdGVcbiAgICAgICAgdmFsaWRhdGVDb250cm9sKGNvbnRyb2wpO1xuXG4gICAgICAgIGlmICghY29udHJvbC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVuc3VyZSB1bmlxdWUgbmFtZXNcbiAgICAgICAgaWYgKGNvbnRyb2wuYXR0cmlidXRlcy5uYW1lIGluIGlucHV0TmFtZXMpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAnQ29udHJvbFsnICtcbiAgICAgICAgICAgICAgICAgICAgKGkgKyAxKSArXG4gICAgICAgICAgICAgICAgICAgICddIGF0dHJpYnV0ZXMubmFtZSBcIicgK1xuICAgICAgICAgICAgICAgICAgICBjb250cm9sLmF0dHJpYnV0ZXMubmFtZSArXG4gICAgICAgICAgICAgICAgICAgICdcIiBoYXMgYWxyZWFkeSBiZWVuIHVzZWQgd2l0aCBDb250cm9sWycgK1xuICAgICAgICAgICAgICAgICAgICAoaW5wdXROYW1lc1tjb250cm9sLmF0dHJpYnV0ZXMubmFtZV0gKyAxKSArXG4gICAgICAgICAgICAgICAgICAgICddJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlucHV0TmFtZXNbY29udHJvbC5hdHRyaWJ1dGVzLm5hbWVdID0gaTtcblxuICAgICAgICBpZiAoJ2lkJyBpbiBjb250cm9sLmF0dHJpYnV0ZXMgJiYgY29udHJvbC5hdHRyaWJ1dGVzLmlkIGluIGlucHV0SWRzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgJ0NvbnRyb2xbJyArXG4gICAgICAgICAgICAgICAgICAgIChpICsgMSkgK1xuICAgICAgICAgICAgICAgICAgICAnXSBhdHRyaWJ1dGVzLmlkIFwiJyArXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2wuYXR0cmlidXRlcy5pZCArXG4gICAgICAgICAgICAgICAgICAgICdcIiBoYXMgYWxyZWFkeSBiZWVuIHVzZWQgd2l0aCBDb250cm9sWycgK1xuICAgICAgICAgICAgICAgICAgICAoaW5wdXRJZHNbY29udHJvbC5hdHRyaWJ1dGVzLmlkXSArIDEpICtcbiAgICAgICAgICAgICAgICAgICAgJ10nXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5wdXRJZHNbY29udHJvbC5hdHRyaWJ1dGVzLmlkXSA9IGk7XG5cbiAgICAgICAgLy8gYWRkIGlkIGF0dHJpYnV0ZSBpZiBtaXNzaW5nXG4gICAgICAgIGlmICgnaWQnIGluIGNvbnRyb2wuYXR0cmlidXRlcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNvbnRyb2wuYXR0cmlidXRlcy5pZCA9XG4gICAgICAgICAgICAgICAgJ2NvbnRyb2wtJyArIGNvbnRyb2wuZWxlbWVudCArICctJyArIChpICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnB1dE5hbWVzID0gbnVsbDtcbiAgICBpbnB1dElkcyA9IG51bGw7XG4gICAgY29udHJvbCA9IG51bGw7XG5cbiAgICByZXR1cm4gY29udHJvbHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKGNvbnRyb2wpIHtcbiAgICBsZXQgbGFiZWwgPSBsYWJlbFRleHQoY29udHJvbCk7XG4gICAgbGV0IHZhbHVlU2NoZW1hID0ge1xuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgbGFiZWwsXG4gICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiB0cnVlLFxuICAgIH07XG5cbiAgICBpZiAoJ3ZhbGlkYXRpb24nIGluIGNvbnRyb2wpIHtcbiAgICAgICAgdmFsdWVTY2hlbWEgPSBtZXJnZSh2YWx1ZVNjaGVtYSwgY29udHJvbC52YWxpZGF0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiByZXF1aXJlZFxuICAgICAgICBpZiAoY29udHJvbC5hdHRyaWJ1dGVzLnJlcXVpcmVkKSB7XG4gICAgICAgICAgICB2YWx1ZVNjaGVtYS50eXBlID1cbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uVHlwZXNbY29udHJvbC5hdHRyaWJ1dGVzLnR5cGVdIHx8ICdzdHJpbmcnO1xuICAgICAgICAgICAgdmFsdWVTY2hlbWEub3B0aW9uYWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIG1pbiBpIHNldFxuICAgIGlmICgnbWluJyBpbiBjb250cm9sLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmFsdWVTY2hlbWEubWluID0gY29udHJvbC5hdHRyaWJ1dGVzLm1pbjtcbiAgICB9XG4gICAgLy8gaWYgbWF4IGlzIHNldFxuICAgIGlmICgnbWF4JyBpbiBjb250cm9sLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmFsdWVTY2hlbWEubWF4ID0gY29udHJvbC5hdHRyaWJ1dGVzLm1heDtcbiAgICB9XG4gICAgLy8gaWYgbWlubGVuZ3RoIGkgc2V0XG4gICAgaWYgKCdtaW5sZW5ndGgnIGluIGNvbnRyb2wuYXR0cmlidXRlcykge1xuICAgICAgICB2YWx1ZVNjaGVtYS5taW4gPSBjb250cm9sLmF0dHJpYnV0ZXMubWlubGVuZ3RoO1xuICAgIH1cbiAgICAvLyBpZiBtYXhsZW5ndGggaXMgc2V0XG4gICAgaWYgKCdtYXhsZW5ndGgnIGluIGNvbnRyb2wuYXR0cmlidXRlcykge1xuICAgICAgICB2YWx1ZVNjaGVtYS5tYXggPSBjb250cm9sLmF0dHJpYnV0ZXMubWF4bGVuZ3RoO1xuICAgIH1cblxuICAgIC8vIGlmIHBhdHRlcm4gaXMgc2V0XG4gICAgaWYgKCdwYXR0ZXJuJyBpbiBjb250cm9sLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmFsdWVTY2hlbWEucGF0dGVybiA9IG5ldyBSZWdFeHAoY29udHJvbC5hdHRyaWJ1dGVzLnBhdHRlcm4pO1xuICAgIH1cblxuXG4gICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodmFsdWVTY2hlbWEsMCw0KSk7XG5cbiAgICBsZXQgc2NoZW1hID0ge1xuICAgICAgICB2YWx1ZTogdmFsdWVTY2hlbWEsXG4gICAgfTtcblxuICAgIC8vIHZhbGlkYXRlXG4gICAgbGV0IG9iaiA9IHsgdmFsdWU6IGNvbnRyb2wuYXR0cmlidXRlcy52YWx1ZSB9O1xuICAgIGxldCBlcnJvciA9IHZhbGlkYXRlKG9iaiwgc2NoZW1hLCAnJywgZmFsc2UpO1xuXG4gICAgY29udHJvbC5hdHRyaWJ1dGVzLnZhbHVlID0gb2JqLnZhbHVlO1xuICAgIGNvbnRyb2wuZXJyb3IgPSBlcnJvcjtcblxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHNjaGVtYSwgMCwgNCkpO1xuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGVycm9yLCAwLCA0KSk7XG59XG4iLCI8IS0tXG4gQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuIFxuIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4tLT5cblxuPHNjcmlwdD5cbiAgICBleHBvcnQgbGV0IGNvbnRyb2w7XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz1cImVycm9yXCI+e0BodG1sIGNvbnRyb2wuZXJyb3IgfHwgXCJcIn08L2Rpdj4iLCI8IS0tXG4gQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuIFxuIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4tLT5cblxuPHNjcmlwdD5cbiAgaW1wb3J0IHsgbGFiZWxUZXh0IH0gZnJvbSBcIi4uL2xpYi91dGlscy5qc1wiO1xuXG4gIGV4cG9ydCBsZXQgY29udHJvbDtcbiAgZXhwb3J0IGxldCBsYWJlbDtcbiAgZXhwb3J0IGxldCBpZDtcblxuICAkOiBpZiAoIWxhYmVsKSB7XG4gICAgbGFiZWwgPSBsYWJlbFRleHQoY29udHJvbCk7XG4gIH1cbjwvc2NyaXB0PlxuXG5cbjxsYWJlbCBmb3I9e2lkIHx8IGNvbnRyb2wuYXR0cmlidXRlcy5pZH0+e0BodG1sIGxhYmVsfTwvbGFiZWw+XG5cblxuIiwiPCEtLVxuIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiBcbiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuLS0+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBFcnJvciBmcm9tIFwiLi4vRXJyb3Iuc3ZlbHRlXCI7XG4gIGltcG9ydCBMYWJlbCBmcm9tIFwiLi4vTGFiZWwuc3ZlbHRlXCI7XG5cbiAgZXhwb3J0IGxldCBjb250cm9sO1xuICBleHBvcnQgbGV0IG9uQ2hhbmdlO1xuXG4gIGxldCB0eXBlO1xuXG4gICQ6IHtcbiAgICB0eXBlID0gY29udHJvbC5hdHRyaWJ1dGVzLnR5cGU7XG5cbiAgICAvLyBkbyBub3QgaGF2ZSByZXF1aXJlZCBpbiBoaWRkZW4gZmllbGRzXG4gICAgaWYgKHR5cGUgPT0gXCJoaWRkZW5cIikge1xuICAgICAgLy8gaHR0cHM6Ly9yYWR1LmxpbmsvZml4LWludmFsaWQtZm9ybS1jb250cm9sLW5vdC1mb2N1c2FibGUvXG4gICAgICBkZWxldGUgY29udHJvbC5hdHRyaWJ1dGVzLnJlcXVpcmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vICAgJDogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoY29udHJvbCwgMCwgNCkpO1xuPC9zY3JpcHQ+XG5cbjwhLS0gUmFkaW8gQm94ZXMgLS0+XG57I2lmIHR5cGUgPT0gXCJyYWRpb1wifVxuICA8ZGl2IGNsYXNzPVwibGFiZWwtY29udGFpbmVyXCI+XG4gICAgPGRpdj5cbiAgICAgIHsjZWFjaCBjb250cm9sLm9wdGlvbnMgYXMgb3B0aW9uLCBpfVxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB7Li4uY29udHJvbC5hdHRyaWJ1dGVzfVxuICAgICAgICAgIGlkPXtjb250cm9sLmF0dHJpYnV0ZXMuaWQgKyBcIi1cIiArIChpICsgMSl9XG4gICAgICAgICAgdmFsdWU9e29wdGlvbi52YWx1ZSB8fCBvcHRpb259XG4gICAgICAgICAgb246Y2hhbmdlPXtvbkNoYW5nZX1cbiAgICAgICAgICBvbjprZXl1cD17b25DaGFuZ2V9XG4gICAgICAgIC8+XG5cbiAgICAgICAgPExhYmVsXG4gICAgICAgICAgYmluZDpjb250cm9sXG4gICAgICAgICAgbGFiZWw9e29wdGlvbi50ZXh0IHx8IG9wdGlvbn1cbiAgICAgICAgICBpZD17Y29udHJvbC5hdHRyaWJ1dGVzLmlkICsgXCItXCIgKyAoaSArIDEpfVxuICAgICAgICAvPlxuICAgICAgey9lYWNofVxuICAgIDwvZGl2PlxuXG4gICAgPEVycm9yIGJpbmQ6Y29udHJvbCAvPlxuICA8L2Rpdj5cblxuICA8IS0tIENoZWNrIEJveGVzIC0tPlxuezplbHNlIGlmIHR5cGUgPT0gXCJjaGVja2JveFwifVxuICA8ZGl2IGNsYXNzPVwibGFiZWwtY29udGFpbmVyXCI+XG4gICAgPGRpdj5cbiAgICAgIDxpbnB1dCB7Li4uY29udHJvbC5hdHRyaWJ1dGVzfSBvbjpjaGFuZ2U9e29uQ2hhbmdlfSBvbjprZXl1cD17b25DaGFuZ2V9IC8+XG5cbiAgICAgIDxMYWJlbCBiaW5kOmNvbnRyb2wgLz5cbiAgICA8L2Rpdj5cblxuICAgIDxFcnJvciBiaW5kOmNvbnRyb2wgLz5cbiAgPC9kaXY+XG57OmVsc2UgaWYgdHlwZSA9PSBcImhpZGRlblwifVxuICA8aW5wdXQgey4uLmNvbnRyb2wuYXR0cmlidXRlc30gb246Y2hhbmdlPXtvbkNoYW5nZX0gb246a2V5dXA9e29uQ2hhbmdlfSAvPlxuezplbHNlfVxuICA8ZGl2IGNsYXNzPVwibGFiZWwtY29udGFpbmVyXCI+XG4gICAgPExhYmVsIGJpbmQ6Y29udHJvbCAvPlxuICAgIDxFcnJvciBiaW5kOmNvbnRyb2wgLz5cbiAgPC9kaXY+XG4gIDxpbnB1dCB7Li4uY29udHJvbC5hdHRyaWJ1dGVzfSBvbjpjaGFuZ2U9e29uQ2hhbmdlfSBvbjprZXl1cD17b25DaGFuZ2V9IC8+XG57L2lmfVxuIiwiPCEtLVxuIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiBcbiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuLS0+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBFcnJvciBmcm9tIFwiLi4vRXJyb3Iuc3ZlbHRlXCI7XG4gIGltcG9ydCBMYWJlbCBmcm9tIFwiLi4vTGFiZWwuc3ZlbHRlXCI7XG5cbiAgZXhwb3J0IGxldCBjb250cm9sO1xuICBleHBvcnQgbGV0IG9uQ2hhbmdlO1xuXG4gICQ6IGlmIChjb250cm9sICYmIGNvbnRyb2wuYXR0cmlidXRlcykge1xuICAgIGNvbnRyb2wuYXR0cmlidXRlcy52YWx1ZSA9IGNvbnRyb2wuYXR0cmlidXRlcy52YWx1ZSB8fCBudWxsO1xuICAgIGNvbnRyb2wuYXR0cmlidXRlcy5wbGFjZWhvbGRlciA9IGNvbnRyb2wuYXR0cmlidXRlcy5wbGFjZWhvbGRlciB8fCBcIlNlbGVjdCBWYWx1ZVwiO1xuICB9XG5cbiAgLy8gICAkOiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShjb250cm9sLCAwLCA0KSk7XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz1cImxhYmVsLWNvbnRhaW5lclwiPlxuICA8TGFiZWwgYmluZDpjb250cm9sIC8+XG4gIDxFcnJvciBiaW5kOmNvbnRyb2wgLz5cbjwvZGl2PlxuXG48c2VsZWN0XG4gIHsuLi5jb250cm9sLmF0dHJpYnV0ZXN9XG4gIG9uOmNoYW5nZT17b25DaGFuZ2V9XG4gIHBsYWNlaG9sZGVyPXtjb250cm9sLmF0dHJpYnV0ZXMudmFsdWUgPyBudWxsIDogY29udHJvbC5hdHRyaWJ1dGVzLnBsYWNlaG9sZGVyfVxuPlxuICB7I2lmIGNvbnRyb2wuYXR0cmlidXRlcy5wbGFjZWhvbGRlcn1cbiAgICA8b3B0aW9uIHZhbHVlPXtudWxsfSBzZWxlY3RlZCBkaXNhYmxlZD57Y29udHJvbC5hdHRyaWJ1dGVzLnBsYWNlaG9sZGVyfTwvb3B0aW9uPlxuICB7L2lmfVxuICB7I2VhY2ggY29udHJvbC5vcHRpb25zIGFzIG9wdGlvbn1cbiAgICA8b3B0aW9uIHZhbHVlPXtTdHJpbmcob3B0aW9uLnZhbHVlIHx8IG9wdGlvbil9PntvcHRpb24udGV4dCB8fCBvcHRpb259PC9vcHRpb24+XG4gIHsvZWFjaH1cbjwvc2VsZWN0PlxuIiwiPCEtLVxuIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiBcbiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuLS0+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBFcnJvciBmcm9tIFwiLi4vRXJyb3Iuc3ZlbHRlXCI7XG4gIGltcG9ydCBMYWJlbCBmcm9tIFwiLi4vTGFiZWwuc3ZlbHRlXCI7XG5cbiAgZXhwb3J0IGxldCBjb250cm9sO1xuICBleHBvcnQgbGV0IG9uQ2hhbmdlO1xuXG4gIC8vICAgJDogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoY29udHJvbCwgMCwgNCkpO1xuPC9zY3JpcHQ+XG5cbjxkaXYgY2xhc3M9XCJsYWJlbC1jb250YWluZXJcIj5cbiAgPExhYmVsIGJpbmQ6Y29udHJvbCAvPlxuICA8RXJyb3IgYmluZDpjb250cm9sIC8+XG48L2Rpdj5cblxuPHRleHRhcmVhIHsuLi5jb250cm9sLmF0dHJpYnV0ZXN9IG9uOmNoYW5nZT17b25DaGFuZ2V9IG9uOmtleXVwPXtvbkNoYW5nZX0gLz5cbiIsImltcG9ydCB7XG5cdHJ1bl9hbGwsXG5cdHN1YnNjcmliZSxcblx0bm9vcCxcblx0c2FmZV9ub3RfZXF1YWwsXG5cdGlzX2Z1bmN0aW9uLFxuXHRnZXRfc3RvcmVfdmFsdWVcbn0gZnJvbSAnLi4vaW50ZXJuYWwvaW5kZXguanMnO1xuXG5jb25zdCBzdWJzY3JpYmVyX3F1ZXVlID0gW107XG5cbi8qKlxuICogQ3JlYXRlcyBhIGBSZWFkYWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI3JlYWRhYmxlXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlN0YXJ0U3RvcE5vdGlmaWVyPFQ+fSBbc3RhcnRdXG4gKiBAcmV0dXJucyB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlJlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGFibGUodmFsdWUsIHN0YXJ0KSB7XG5cdHJldHVybiB7XG5cdFx0c3Vic2NyaWJlOiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQpLnN1YnNjcmliZVxuXHR9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBXcml0YWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgYm90aCB1cGRhdGluZyBhbmQgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI3dyaXRhYmxlXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlN0YXJ0U3RvcE5vdGlmaWVyPFQ+fSBbc3RhcnRdXG4gKiBAcmV0dXJucyB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLldyaXRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuXHQvKiogQHR5cGUge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5VbnN1YnNjcmliZXJ9ICovXG5cdGxldCBzdG9wO1xuXHQvKiogQHR5cGUge1NldDxpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLlN1YnNjcmliZUludmFsaWRhdGVUdXBsZTxUPj59ICovXG5cdGNvbnN0IHN1YnNjcmliZXJzID0gbmV3IFNldCgpO1xuXHQvKiogQHBhcmFtIHtUfSBuZXdfdmFsdWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0aWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG5cdFx0XHR2YWx1ZSA9IG5ld192YWx1ZTtcblx0XHRcdGlmIChzdG9wKSB7XG5cdFx0XHRcdC8vIHN0b3JlIGlzIHJlYWR5XG5cdFx0XHRcdGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHN1YnNjcmliZXJzKSB7XG5cdFx0XHRcdFx0c3Vic2NyaWJlclsxXSgpO1xuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUucHVzaChzdWJzY3JpYmVyLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bl9xdWV1ZSkge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5VcGRhdGVyPFQ+fSBmblxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGZ1bmN0aW9uIHVwZGF0ZShmbikge1xuXHRcdHNldChmbih2YWx1ZSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlN1YnNjcmliZXI8VD59IHJ1blxuXHQgKiBAcGFyYW0ge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuSW52YWxpZGF0b3I8VD59IFtpbnZhbGlkYXRlXVxuXHQgKiBAcmV0dXJucyB7aW1wb3J0KCcuL3B1YmxpYy5qcycpLlVuc3Vic2NyaWJlcn1cblx0ICovXG5cdGZ1bmN0aW9uIHN1YnNjcmliZShydW4sIGludmFsaWRhdGUgPSBub29wKSB7XG5cdFx0LyoqIEB0eXBlIHtpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLlN1YnNjcmliZUludmFsaWRhdGVUdXBsZTxUPn0gKi9cblx0XHRjb25zdCBzdWJzY3JpYmVyID0gW3J1biwgaW52YWxpZGF0ZV07XG5cdFx0c3Vic2NyaWJlcnMuYWRkKHN1YnNjcmliZXIpO1xuXHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAxKSB7XG5cdFx0XHRzdG9wID0gc3RhcnQoc2V0LCB1cGRhdGUpIHx8IG5vb3A7XG5cdFx0fVxuXHRcdHJ1bih2YWx1ZSk7XG5cdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdHN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKTtcblx0XHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAwICYmIHN0b3ApIHtcblx0XHRcdFx0c3RvcCgpO1xuXHRcdFx0XHRzdG9wID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS1zdG9yZSNkZXJpdmVkXG4gKiBAdGVtcGxhdGUge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuU3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3JlcyAtIGlucHV0IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBpbXBvcnQoJy4vcHJpdmF0ZS5qcycpLlN0b3Jlc1ZhbHVlczxTPiwgc2V0OiAodmFsdWU6IFQpID0+IHZvaWQsIHVwZGF0ZTogKGZuOiBpbXBvcnQoJy4vcHVibGljLmpzJykuVXBkYXRlcjxUPikgPT4gdm9pZCkgPT4gaW1wb3J0KCcuL3B1YmxpYy5qcycpLlVuc3Vic2NyaWJlciB8IHZvaWR9IGZuIC0gZnVuY3Rpb24gY2FsbGJhY2sgdGhhdCBhZ2dyZWdhdGVzIHRoZSB2YWx1ZXNcbiAqIEBwYXJhbSB7VH0gW2luaXRpYWxfdmFsdWVdIC0gaW5pdGlhbCB2YWx1ZVxuICogQHJldHVybnMge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5SZWFkYWJsZTxUPn1cbiAqL1xuXG4vKipcbiAqIERlcml2ZWQgdmFsdWUgc3RvcmUgYnkgc3luY2hyb25pemluZyBvbmUgb3IgbW9yZSByZWFkYWJsZSBzdG9yZXMgYW5kXG4gKiBhcHBseWluZyBhbiBhZ2dyZWdhdGlvbiBmdW5jdGlvbiBvdmVyIGl0cyBpbnB1dCB2YWx1ZXMuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI2Rlcml2ZWRcbiAqIEB0ZW1wbGF0ZSB7aW1wb3J0KCcuL3ByaXZhdGUuanMnKS5TdG9yZXN9IFNcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAb3ZlcmxvYWRcbiAqIEBwYXJhbSB7U30gc3RvcmVzIC0gaW5wdXQgc3RvcmVzXG4gKiBAcGFyYW0geyh2YWx1ZXM6IGltcG9ydCgnLi9wcml2YXRlLmpzJykuU3RvcmVzVmFsdWVzPFM+KSA9PiBUfSBmbiAtIGZ1bmN0aW9uIGNhbGxiYWNrIHRoYXQgYWdncmVnYXRlcyB0aGUgdmFsdWVzXG4gKiBAcGFyYW0ge1R9IFtpbml0aWFsX3ZhbHVlXSAtIGluaXRpYWwgdmFsdWVcbiAqIEByZXR1cm5zIHtpbXBvcnQoJy4vcHVibGljLmpzJykuUmVhZGFibGU8VD59XG4gKi9cblxuLyoqXG4gKiBAdGVtcGxhdGUge2ltcG9ydCgnLi9wcml2YXRlLmpzJykuU3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge1R9IFtpbml0aWFsX3ZhbHVlXVxuICogQHJldHVybnMge2ltcG9ydCgnLi9wdWJsaWMuanMnKS5SZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuXHRjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuXHQvKiogQHR5cGUge0FycmF5PGltcG9ydCgnLi9wdWJsaWMuanMnKS5SZWFkYWJsZTxhbnk+Pn0gKi9cblx0Y29uc3Qgc3RvcmVzX2FycmF5ID0gc2luZ2xlID8gW3N0b3Jlc10gOiBzdG9yZXM7XG5cdGlmICghc3RvcmVzX2FycmF5LmV2ZXJ5KEJvb2xlYW4pKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdkZXJpdmVkKCkgZXhwZWN0cyBzdG9yZXMgYXMgaW5wdXQsIGdvdCBhIGZhbHN5IHZhbHVlJyk7XG5cdH1cblx0Y29uc3QgYXV0byA9IGZuLmxlbmd0aCA8IDI7XG5cdHJldHVybiByZWFkYWJsZShpbml0aWFsX3ZhbHVlLCAoc2V0LCB1cGRhdGUpID0+IHtcblx0XHRsZXQgc3RhcnRlZCA9IGZhbHNlO1xuXHRcdGNvbnN0IHZhbHVlcyA9IFtdO1xuXHRcdGxldCBwZW5kaW5nID0gMDtcblx0XHRsZXQgY2xlYW51cCA9IG5vb3A7XG5cdFx0Y29uc3Qgc3luYyA9ICgpID0+IHtcblx0XHRcdGlmIChwZW5kaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNsZWFudXAoKTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGZuKHNpbmdsZSA/IHZhbHVlc1swXSA6IHZhbHVlcywgc2V0LCB1cGRhdGUpO1xuXHRcdFx0aWYgKGF1dG8pIHtcblx0XHRcdFx0c2V0KHJlc3VsdCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjbGVhbnVwID0gaXNfZnVuY3Rpb24ocmVzdWx0KSA/IHJlc3VsdCA6IG5vb3A7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRjb25zdCB1bnN1YnNjcmliZXJzID0gc3RvcmVzX2FycmF5Lm1hcCgoc3RvcmUsIGkpID0+XG5cdFx0XHRzdWJzY3JpYmUoXG5cdFx0XHRcdHN0b3JlLFxuXHRcdFx0XHQodmFsdWUpID0+IHtcblx0XHRcdFx0XHR2YWx1ZXNbaV0gPSB2YWx1ZTtcblx0XHRcdFx0XHRwZW5kaW5nICY9IH4oMSA8PCBpKTtcblx0XHRcdFx0XHRpZiAoc3RhcnRlZCkge1xuXHRcdFx0XHRcdFx0c3luYygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRcdHBlbmRpbmcgfD0gMSA8PCBpO1xuXHRcdFx0XHR9XG5cdFx0XHQpXG5cdFx0KTtcblx0XHRzdGFydGVkID0gdHJ1ZTtcblx0XHRzeW5jKCk7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uIHN0b3AoKSB7XG5cdFx0XHRydW5fYWxsKHVuc3Vic2NyaWJlcnMpO1xuXHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0Ly8gV2UgbmVlZCB0byBzZXQgdGhpcyB0byBmYWxzZSBiZWNhdXNlIGNhbGxiYWNrcyBjYW4gc3RpbGwgaGFwcGVuIGRlc3BpdGUgaGF2aW5nIHVuc3Vic2NyaWJlZDpcblx0XHRcdC8vIENhbGxiYWNrcyBtaWdodCBhbHJlYWR5IGJlIHBsYWNlZCBpbiB0aGUgcXVldWUgd2hpY2ggZG9lc24ndCBrbm93IGl0IHNob3VsZCBubyBsb25nZXJcblx0XHRcdC8vIGludm9rZSB0aGlzIGRlcml2ZWQgc3RvcmUuXG5cdFx0XHRzdGFydGVkID0gZmFsc2U7XG5cdFx0fTtcblx0fSk7XG59XG5cbi8qKlxuICogVGFrZXMgYSBzdG9yZSBhbmQgcmV0dXJucyBhIG5ldyBvbmUgZGVyaXZlZCBmcm9tIHRoZSBvbGQgb25lIHRoYXQgaXMgcmVhZGFibGUuXG4gKlxuICogaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLXN0b3JlI3JlYWRvbmx5XG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtpbXBvcnQoJy4vcHVibGljLmpzJykuUmVhZGFibGU8VD59IHN0b3JlICAtIHN0b3JlIHRvIG1ha2UgcmVhZG9ubHlcbiAqIEByZXR1cm5zIHtpbXBvcnQoJy4vcHVibGljLmpzJykuUmVhZGFibGU8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkb25seShzdG9yZSkge1xuXHRyZXR1cm4ge1xuXHRcdHN1YnNjcmliZTogc3RvcmUuc3Vic2NyaWJlLmJpbmQoc3RvcmUpXG5cdH07XG59XG5cbmV4cG9ydCB7IGdldF9zdG9yZV92YWx1ZSBhcyBnZXQgfTtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDI0IEFudGhvbnkgTXVnZW5kaVxuICpcbiAqIFRoaXMgc29mdHdhcmUgaXMgcmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqL1xuXG5pbXBvcnQgeyB3cml0YWJsZSB9IGZyb20gJ3N2ZWx0ZS9zdG9yZSc7XG5cbmV4cG9ydCBjb25zdCBjdXJyZW50Q29udHJvbCA9IHdyaXRhYmxlKHt9KTtcbmV4cG9ydCBjb25zdCBFcnJvcnMgPSB3cml0YWJsZSh7fSk7XG5leHBvcnQgY29uc3QgVmFsdWVzID0gd3JpdGFibGUoe30pOyIsIjwhLS1cbiBDb3B5cmlnaHQgKGMpIDIwMjQgQW50aG9ueSBNdWdlbmRpXG4gXG4gVGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbi0tPlxuXG48c2NyaXB0PlxuICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuICBpbXBvcnQgeyB2YWxpZGF0ZVZhbHVlIH0gZnJvbSBcIi4uL2xpYi92YWxpZGF0aW9uXCI7XG4gIGltcG9ydCBJbnB1dCBmcm9tIFwiLi9jb250cm9scy9JbnB1dC5zdmVsdGVcIjtcbiAgaW1wb3J0IFNlbGVjdCBmcm9tIFwiLi9jb250cm9scy9TZWxlY3Quc3ZlbHRlXCI7XG4gIGltcG9ydCBUZXh0YXJlYSBmcm9tIFwiLi9jb250cm9scy9UZXh0YXJlYS5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgZm9ybUlucHV0VHlwZXMgfSBmcm9tIFwiLi4vbGliL3V0aWxzXCI7XG4gIGltcG9ydCB7IGN1cnJlbnRDb250cm9sIH0gZnJvbSBcIi4uL2xpYi9zdG9yZVwiO1xuXG4gIGV4cG9ydCBsZXQgY29udHJvbDtcblxuICBsZXQgdHlwZTtcblxuICAkOiBpZiAoY29udHJvbCkge1xuICAgIC8vIGlmIGlzIGEgZm9ybSBpbnB1dCBhbmQgbm90IG90aGVyIGVsZW1lbnRcbiAgICBpZiAoZm9ybUlucHV0VHlwZXMuaW5kZXhPZihjb250cm9sLmVsZW1lbnQpID4gLTEpIHtcbiAgICAgIHR5cGUgPSBjb250cm9sLmF0dHJpYnV0ZXMudHlwZSB8fCBjb250cm9sLmVsZW1lbnQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRyb2wuY3JlYXRpb25NZXRob2QgPT0gXCJkeW5hbWljXCIpIHtcbiAgICAgIC8vIHZhbGlkYXRlIHZhbHVlLi4uXG4gICAgICB2YWxpZGF0ZVZhbHVlKGNvbnRyb2wpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlKGUsIHZhbCwgZWxlbWVudCkge1xuICAgIGxldCB2YWx1ZTtcblxuICAgIGlmIChlKSB7XG4gICAgICBsZXQgZWwgPSBlLnRhcmdldDtcbiAgICAgIGVsZW1lbnQgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIHR5cGUgPSBlbC50eXBlO1xuXG4gICAgICBpZiAoZWwudHlwZSA9PSBcImNoZWNrYm94XCIpIHtcbiAgICAgICAgdmFsdWUgPSBlbC5jaGVja2VkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBlbC52YWx1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZSA9IGNvbnRyb2wuYXR0cmlidXRlcy50eXBlXG4gICAgICB2YWx1ZSA9IHZhbDtcbiAgICB9XG5cblxuICAgIGNvbnRyb2wuYXR0cmlidXRlcy52YWx1ZSA9IHZhbHVlO1xuXG4gICAgdmFsaWRhdGVWYWx1ZShjb250cm9sKTtcblxuICAgIGN1cnJlbnRDb250cm9sLnVwZGF0ZSgobykgPT4gY29udHJvbCk7XG4gIH1cblxuICAvLyBydW4gb25DaGFuZ2UgaWYgdGhlcmUgaXMgYSB2YWx1ZSBwYXNzZWQgb24gY3JlYXRpb25cbiAgb25Nb3VudChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGNvbnRyb2wuYXR0cmlidXRlcyAmJiAoXCJ2YWx1ZVwiIGluIGNvbnRyb2wuYXR0cmlidXRlcyB8fCBjb250cm9sLmF0dHJpYnV0ZXMucmVxdWlyZWQpKSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgb25DaGFuZ2UobnVsbCwgY29udHJvbC5hdHRyaWJ1dGVzLnZhbHVlLCBjb250cm9sLmVsZW1lbnQpO1xuICAgICAgfSwgMSk7XG4gICAgfVxuICB9KTtcbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPXtjb250cm9sLmNsYXNzZXMuam9pbihcIiBcIil9PlxuICA8ZGl2IGNsYXNzPVwiY29udHJvbC1ncm91cHtjb250cm9sLmVycm9yID8gJyBoYXMtZXJyb3InIDogJyd9IHt0eXBlIHx8ICcgY29udGVudCd9IFwiPlxuICAgIHsjaWYgY29udHJvbC5lbGVtZW50ID09IFwiaW5wdXRcIn1cbiAgICAgIDxJbnB1dCBiaW5kOmNvbnRyb2wge29uQ2hhbmdlfSAvPlxuICAgIHs6ZWxzZSBpZiBjb250cm9sLmVsZW1lbnQgPT0gXCJzZWxlY3RcIn1cbiAgICAgIDxTZWxlY3QgYmluZDpjb250cm9sIHtvbkNoYW5nZX0gLz5cbiAgICB7OmVsc2UgaWYgY29udHJvbC5lbGVtZW50ID09IFwidGV4dGFyZWFcIn1cbiAgICAgIDxUZXh0YXJlYSBiaW5kOmNvbnRyb2wge29uQ2hhbmdlfSAvPlxuICAgIHs6ZWxzZX1cbiAgICAgIDxzdmVsdGU6ZWxlbWVudCB0aGlzPXtjb250cm9sLmVsZW1lbnR9PlxuICAgICAgICB7QGh0bWwgY29udHJvbC5jb250ZW50fVxuICAgICAgPC9zdmVsdGU6ZWxlbWVudD5cbiAgICB7L2lmfVxuICA8L2Rpdj5cbjwvZGl2PlxuIiwiPCEtLVxuIENvcHlyaWdodCAoYykgMjAyNCBBbnRob255IE11Z2VuZGlcbiBcbiBUaGlzIHNvZnR3YXJlIGlzIHJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuLS0+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBcIi4vc3R5bGVzL2Jvb3RzdHJhcC1ncmlkLnNjc3NcIjtcbiAgaW1wb3J0IFwiLi9zdHlsZXMvZm9ybS5zY3NzXCI7XG5cbiAgaW1wb3J0IENvbnRyb2wgZnJvbSBcIi4vZWxlbWVudHMvQ29udHJvbC5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgdmFsaWRhdGVDb250cm9sLCB2YWxpZGF0ZUNvbnRyb2xzIH0gZnJvbSBcIi4vbGliL3ZhbGlkYXRpb24uanNcIjtcbiAgaW1wb3J0IHsgRXJyb3JzLCBWYWx1ZXMsIGN1cnJlbnRDb250cm9sIH0gZnJvbSBcIi4vbGliL3N0b3JlXCI7XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGltcG9ydCB7IG1lcmdlIH0gZnJvbSBcIi4vbGliL21lcmdlXCI7XG5cbiAgZXhwb3J0IGxldCBjb250cm9scyA9IFtdO1xuICBleHBvcnQgbGV0IG1ldGhvZCA9IFwiUE9TVFwiO1xuICBleHBvcnQgbGV0IGFjdGlvbiA9IFwiXCI7XG4gIGV4cG9ydCBsZXQgZmFpbE9uRXJyb3IgPSB0cnVlO1xuXG4gIGxldCBpc1JlYWR5ID0gZmFsc2U7XG5cbiAgZm9ybWF0Q29udHJvbHMoKTtcblxuICAkOiBpZiAoJGN1cnJlbnRDb250cm9sKSB7XG4gICAgcHJvcGFnYXRlT25DaGFuZ2UoJGN1cnJlbnRDb250cm9sKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdENvbnRyb2xzKCkge1xuICAgIGxldCBlcnJvcnMgPSB7fTtcbiAgICBsZXQgdmFsdWVzID0ge307XG5cbiAgICBmb3IgKGxldCBpIGluIGNvbnRyb2xzKSB7XG4gICAgICBjb250cm9sc1tpXS5pZHggPSBOdW1iZXIoaSkgKyAxO1xuXG4gICAgICBpZiAoXCJlcnJvclwiIGluIGNvbnRyb2xzW2ldICYmIGNvbnRyb2xzW2ldLmVycm9yKSB7XG4gICAgICAgIGVycm9yc1tjb250cm9sc1tpXS5hdHRyaWJ1dGVzLm5hbWVdID0gY29udHJvbHNbaV0uZXJyb3I7XG4gICAgICB9XG4gICAgICBpZiAoY29udHJvbHNbaV0uYXR0cmlidXRlcyAmJiBcInZhbHVlXCIgaW4gY29udHJvbHNbaV0uYXR0cmlidXRlcykge1xuICAgICAgICAvLyB1c2UgYm9vbGVhbnMgZm9yIGNoZWNrYm94ZXNcbiAgICAgICAgaWYgKGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMudHlwZSA9PSBcImNoZWNrYm94XCIpIHtcbiAgICAgICAgICBjb250cm9sc1tpXS5hdHRyaWJ1dGVzLnZhbHVlID0gY29udHJvbHNbaV0uYXR0cmlidXRlcy52YWx1ZSA9PSBcInRydWVcIiA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXNbY29udHJvbHNbaV0uYXR0cmlidXRlcy5uYW1lXSA9IGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgRXJyb3JzLnVwZGF0ZSgobykgPT4gZXJyb3JzKTtcbiAgICBWYWx1ZXMudXBkYXRlKChvKSA9PiB2YWx1ZXMpO1xuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGVycm9ycywgMCwgNCkpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcHJvcGFnYXRlT25DaGFuZ2UoY29udHJvbCkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoXCJvbkNoYW5nZVwiIGluIGNvbnRyb2wgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGV0IG9uQ2hhbmdlT2JqO1xuICAgICAgbGV0IHNldFZhbHVlO1xuXG4gICAgICAvLyBjb250cm9sLm9uQ2hhbmdlUmVzZXRzID0gY29udHJvbC5vbkNoYW5nZVJlc2V0cyB8fCB7fTtcblxuICAgICAgZm9yIChsZXQgaSBpbiBjb250cm9sLm9uQ2hhbmdlKSB7XG4gICAgICAgIG9uQ2hhbmdlT2JqID0gY29udHJvbC5vbkNoYW5nZVtpXTtcblxuICAgICAgICBpZiAodHlwZW9mIG9uQ2hhbmdlT2JqLnNldCA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICBzZXRWYWx1ZSA9IGF3YWl0IG9uQ2hhbmdlT2JqLnNldCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldFZhbHVlID0gYXdhaXQgb25DaGFuZ2VPYmouc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBzZXRWYWx1ZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGFsbCB0aGUgbmFtZXMgcmV0dXJuZWQgYnkgc2V0XG4gICAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBzZXRWYWx1ZSkge1xuICAgICAgICAgICAgLy8gZmluZCBjb250cm9sIHdpdGggbmFtZVxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjb250cm9scykge1xuICAgICAgICAgICAgICBsZXQgbmV3Q29udHJvbCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgaWYgKFwiYXR0cmlidXRlc1wiIGluIGNvbnRyb2xzW2ldID09PSBmYWxzZSB8fCBuYW1lICE9PSBjb250cm9sc1tpXS5hdHRyaWJ1dGVzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIGNoZWNrIHZhbHVlIGlmIHNldFxuICAgICAgICAgICAgICBpZiAoXCJ2YWx1ZVwiIGluIG9uQ2hhbmdlT2JqICYmIGNvbnRyb2wuYXR0cmlidXRlcy52YWx1ZSAhPT0gb25DaGFuZ2VPYmoudmFsdWUpIHtcbiAgICAgICAgICAgICAgICBuZXdDb250cm9sID0gY29udHJvbC5vbkNoYW5nZVJlc2V0c1tuYW1lXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhvbkNoYW5nZU9iaik7XG5cbiAgICAgICAgICAgICAgICBjb250cm9sLm9uQ2hhbmdlUmVzZXRzW25hbWVdID1cbiAgICAgICAgICAgICAgICAgIGNvbnRyb2wub25DaGFuZ2VSZXNldHNbbmFtZV0gfHwgbWVyZ2Uoe30sIGNvbnRyb2xzW2ldKTtcblxuICAgICAgICAgICAgICAgIG5ld0NvbnRyb2wgPSBtZXJnZShcbiAgICAgICAgICAgICAgICAgIGNvbnRyb2xzW2ldLFxuICAgICAgICAgICAgICAgICAgc2V0VmFsdWVbbmFtZV0sXG4gICAgICAgICAgICAgICAgICAvLyBkbyBub3QgY2hhbmdlIHNvbWUgdmFsdWVzIHN1Y2ggYXMgZWxlbWVudCAmIGF0dHJpYnV0ZXMudHlwZVxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBjb250cm9sc1tpXS5lbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgaWQ6IGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29udHJvbHNbaV0uYXR0cmlidXRlcy5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbnRyb2xzW2ldLmF0dHJpYnV0ZXMudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRpb25NZXRob2Q6IFwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAobmV3Q29udHJvbCkge1xuICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRlXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVDb250cm9sKG5ld0NvbnRyb2wpO1xuICAgICAgICAgICAgICAgIC8vIGFzc2lnbiB2YWx1ZVxuICAgICAgICAgICAgICAgIGNvbnRyb2xzW2ldID0gbmV3Q29udHJvbDtcbiAgICAgICAgICAgICAgICBjdXJyZW50Q29udHJvbC51cGRhdGUoKG8pID0+IGNvbnRyb2xzW2ldKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdWJtaXRGb3JtKGUpIHtcbiAgICBpZiAoZmFpbE9uRXJyb3IgJiYgaGFzRXJyb3JzKCkpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYXNFcnJvcnMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKCRFcnJvcnMpLmxlbmd0aCA+IDA7XG4gIH1cblxuICBvbk1vdW50KGZ1bmN0aW9uICgpIHtcbiAgICB2YWxpZGF0ZUNvbnRyb2xzKGNvbnRyb2xzKTtcbiAgICBpc1JlYWR5ID0gdHJ1ZTtcbiAgfSk7XG48L3NjcmlwdD5cblxueyNpZiBpc1JlYWR5fVxuICA8ZGl2IGNsYXNzPVwiZm9ybWVyXCI+XG4gICAgPGZvcm0gY2xhc3M9XCJjb250YWluZXItZmx1aWRcIiBvbjpzdWJtaXQ9e3N1Ym1pdEZvcm19IHthY3Rpb259IHttZXRob2R9PlxuICAgICAgPGRpdiBjbGFzcz1cInJvd1wiPlxuICAgICAgICB7I2VhY2ggY29udHJvbHMgYXMgY29udHJvbCwgaX1cbiAgICAgICAgICA8Q29udHJvbCBiaW5kOmNvbnRyb2wgaWR4PXtpICsgMX0gLz5cbiAgICAgICAgey9lYWNofVxuXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJidXR0b25cIj5TdWJtaXQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9ybT5cbiAgPC9kaXY+XG57L2lmfVxuIl0sIm5hbWVzIjpbImdsb2JhbCIsInRoaXMiLCJjcmVhdGVfaWZfYmxvY2siXSwibWFwcGluZ3MiOiI7OztDQUFBO0NBQ08sU0FBUyxJQUFJLEdBQUcsRUFBRTtBQUd6QjtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ08sU0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtDQUNqQztDQUNBLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN0QyxDQUFDLDZCQUE2QixHQUFHLEVBQUU7Q0FDbkMsQ0FBQztBQXNCRDtDQUNPLFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRTtDQUN4QixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Q0FDYixDQUFDO0FBQ0Q7Q0FDTyxTQUFTLFlBQVksR0FBRztDQUMvQixDQUFDLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUM1QixDQUFDO0FBQ0Q7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNPLFNBQVMsT0FBTyxDQUFDLEdBQUcsRUFBRTtDQUM3QixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDbEIsQ0FBQztBQUNEO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDTyxTQUFTLFdBQVcsQ0FBQyxLQUFLLEVBQUU7Q0FDbkMsQ0FBQyxPQUFPLE9BQU8sS0FBSyxLQUFLLFVBQVUsQ0FBQztDQUNwQyxDQUFDO0FBQ0Q7Q0FDQTtDQUNPLFNBQVMsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7Q0FDckMsQ0FBQyxPQUFPLENB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QUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7OztDQ0F4dEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0RBQWtELENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDL1osQ0FBQSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLE9BQU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sTUFBTSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsT0FBTyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPQSxjQUFNLEVBQUVBLGNBQU0sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQ0MsY0FBSSxDQUFDLENBQUM7RUFDdGUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsR0FBRyxPQUFPLE1BQU0sRUFBRSxRQUFRLEdBQUcsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0NBQ3JVLENBQUEsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztFQUMvTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUs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SUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLE1BQU0sR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUM1ZCxDQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUNqYSxDQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNuVixDQUFBLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzllLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsT0FBTyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2xPLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLEVBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzFmLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxvQkFBb0I7Q0FDcGdCLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDbFYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLE9BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRztFQUN0ZixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDO0VBQ3pmLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztFQUN4Z0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUM7Q0FDOWYsQ0FBQSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ2xjLENBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDOVgsQ0FBQSxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQzFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ3JnQixDQUFBLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxPQUFPLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU87Q0FDMWYsQ0FBQSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU0sQ0FBQyxNQUFNLENBQUMsb0RBQW9ELENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvYkFBb2I7RUFDajFCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU0sQ0FBQyxNQUFNLENBQUMsb0RBQW9ELENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxRkFBcUYsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElB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LEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyw0QkFBNEI7RUFDMWYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMs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QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLO0dBQ3RmLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlGQUFpRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlMQUFpTCxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsNElBQTRJLENBQUM7RUFDaGpCLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlIQUF5SCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdDQUFnQztHQUM3ZixDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjO0VBQ3RnQixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlGQUF5RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9GQUFvRixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXO0NBQzFmLENBQUEsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXO0VBQ3RnQixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN2ZixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsT0FBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMEhBQTBILENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDJEQUEyRCxDQUFDLENBQUM7RUFDOWdCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxnRUFBZ0UsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsNFFBQTRRLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlIQUFpSCxDQUFDLENBQUM7Q0FDeGtCLENBQUEsT0FBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFNLENBQUMsTUFBTSxDQUFDLG9EQUFvRCxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx3REFBd0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0NBQ3pnQixDQUFBLE9BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFD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QUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1REFBdUQsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Q0FDaGdCLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxPQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLCtDQUErQyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQjtFQUN4ZixNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsT0FBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFZQUFxWSxDQUFDLENBQUMsQ0FBQztFQUM3bkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsT0FBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdHQUFnRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUVBQWlFLENBQUMsQ0FBQztDQUNwakIsQ0FBQSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEdB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Q0FBQyxPQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVU7RUFDOWYsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxDQUFD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QWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0NBQzdmLENBQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7RUFDemYsSUFBSSxFQUFFLENBQUMsdUpBQXVKLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLHNFQUFzRSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsNEdBQTRHO0VBQ3ZpQixFQUFFLENBQUMsOEpBQThKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLDhEQUE4RCxDQUFDLElBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7Q0FDN2YsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsbUNBQW1DO0NBQ3hnQixDQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSx1Q0FBdUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0VBQy9oQixPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVE7Q0FDaGdCLENBQUEsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxvRUFBb0UsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHViQUF1YixDQUFDLENBQUM7Q0FDcHhCLENBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLDhHQUE4RztDQUNsaUIsQ0FBQSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsNERBQTRELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUNoZ0IsQ0FBQSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxPQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztFQUN2ZixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTO0VBQzlmLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU0sZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FB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QWlDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO0VBQ2xpQixDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN2ZixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN2Z0IsQ0FBQSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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QUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7Q0FDNUUsZ0JBQWdCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0NBQzVFLGdCQUFnQixPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtDQUMzRSxnQkFBZ0IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7Q0FDMUUsZ0JBQWdCLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0NBQzdFLGdCQUFnQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtBQUM1RTtDQUNBLGdCQUFnQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtDQUMzRSxnQkFBZ0IsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7Q0FDNUUsZ0JBQWdCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0NBQ3ZFLGdCQUFnQixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtDQUN4RSxnQkFBZ0IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxF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UyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDN0QsZ0JBQWdCLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUM1RCxnQkFBZ0IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDNUUsZ0JBQWdCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQzVFLGdCQUFnQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDN0QsZ0JBQWdCLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUM5RCxnQkFBZ0IsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3hELGdCQUFnQixVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDL0QsZ0JBQWdCLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUMzRCxnQkFBZ0IsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQzlELGdCQUFnQixTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDOUQsZ0JBQWdCLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtDQUNwRSxnQkFBZ0IsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0NBQ3BFLGdCQUFnQixRQUFR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LEtBQUssQ0FBQTs7OztDQUlOLENBQUEsU0FBQSxVQUFVLENBQUMsQ0FBQyxFQUFBO0NBQ2YsRUFBQSxJQUFBLFdBQVcsSUFBSSxTQUFTLEVBQUEsRUFBQTtDQUMxQixHQUFBLENBQUMsQ0FBQyxjQUFjLEVBQUEsQ0FBQTs7OztXQUlYLFNBQVMsR0FBQTtDQUNULEVBQUEsT0FBQSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBRSxDQUFBLE1BQU0sR0FBRyxDQUFDLENBQUE7OztFQUd4QyxPQUFPLENBQUEsWUFBQTtDQUNMLEVBQUEsZ0JBQWdCLENBQUMsUUFBUSxDQUFBLENBQUE7Q0FDekIsRUFBQSxZQUFBLENBQUEsQ0FBQSxFQUFBLE9BQU8sR0FBRyxJQUFJLENBQUEsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FoSGhCLE9BQU8sZUFBZSxFQUFBO0NBQ3BCLElBQUEsaUJBQWlCLENBQUMsZUFBZSxDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwyMV19


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
