/**
 * @name Better Mode Select
 * @author DeliriumOverdose
 * @version 1.0.0
 * @description Responsive game mode selection with draggable modes and queues, and saved custom ordering.
 */

// Standalone bundle. No imports, dependencies, configuration file or network requests.
const BETTER_MODE_SELECT_KEY = 'better-mode-select-order-v1';
const ROOT = '.parties-game-type-select-wrapper';
const CARD = '.game-type-card';
const QUEUES = '.parties-game-type-card-categories';
const UPPER = '.parties-game-type-upper-half';
const ITEM = '.parties-game-type-card-category-div';
const LAYOUT_VARS = ['--wg-bms-lower-height','--wg-bms-header-height','--wg-bms-columns','--wg-bms-icon-size','--wg-bms-title-size'];

const BETTER_MODE_SELECT_CSS = `
${ROOT}.wg-bms { width:97% !important; position:relative !important; align-items:flex-start !important; gap:12px !important; min-height:calc(30px + var(--wg-bms-header-height,230px) + var(--wg-bms-lower-height,250px)) !important; }
.wg-bms > .game-type-card { position:static !important; flex:1 1 0 !important; min-width:0 !important; width:auto !important; margin:30px 0 0 !important; }
.wg-bms .parties-game-type-upper-half { width:100% !important; height:var(--wg-bms-header-height,230px) !important; }
.wg-bms > hr { top:calc(30px + var(--wg-bms-header-height,230px)) !important; }
.wg-bms .parties-game-type-upper-half .vertical-separator { height:calc(var(--wg-bms-header-height,230px) - 4px) !important; }
.wg-bms .parties-game-type-icon { min-width:0 !important; width:100% !important; height:100% !important; padding-top:6px !important; }
.wg-bms .parties-game-type-icon .icon-frame { width:var(--wg-bms-icon-size,105px) !important; height:var(--wg-bms-icon-size,105px) !important; margin-bottom:8px !important; }
.wg-bms .parties-game-type-icon .icon-frame .icon-bg { width:100% !important; height:100% !important; background-size:contain !important; }
.wg-bms .parties-game-type-icon .icon-frame .icon-bg video { max-width:100% !important; max-height:100% !important; }
.wg-bms .parties-game-type-card-name { width:100% !important; font-size:var(--wg-bms-title-size,24px) !important; line-height:1.15 !important; overflow-wrap:anywhere !important; }
.wg-bms .parties-game-type-lower-half { display:none !important; }
.wg-bms .game-type-card.selected:not(.wg-dq-hidden) .parties-game-type-lower-half { display:flex !important; position:absolute !important; inset:calc(30px + var(--wg-bms-header-height,230px)) 0 auto !important; width:100% !important; height:auto !important; max-height:var(--wg-bms-lower-height,calc(100vh - 460px)) !important; overflow:auto !important; box-sizing:border-box !important; padding:12px 24px 20px !important; opacity:1 !important; }
.wg-bms .parties-game-type-card-intro { width:100% !important; margin:8px 0 12px !important; }
.wg-bms .parties-game-type-card-intro p { min-height:0 !important; }
.wg-bms .parties-game-type-card-categories { display:grid !important; grid-template-columns:repeat(var(--wg-bms-columns,3),minmax(0,1fr)) !important; gap:12px 0 !important; width:100% !important; height:auto !important; max-height:none !important; overflow:visible !important; }
.wg-bms .parties-game-type-card-category-div { min-width:0 !important; width:auto !important; min-height:64px !important; margin:0 !important; padding:8px 16px !important; border-inline-end:1px solid #a09b8c66 !important; box-sizing:border-box !important; align-items:flex-start !important; }
.wg-bms .parties-game-type-card-category-btn { white-space:normal !important; text-align:start !important; }
.wg-bms [draggable="true"] { cursor:grab !important; }
.wg-bms .parties-game-type-card-category-div { cursor:grab !important; touch-action:none !important; }
.wg-bms .parties-game-type-card-category-div, .wg-bms .parties-game-type-card-category-div * { -webkit-user-drag:none !important; }
.wg-bms.wg-bms-pointer-drag, .wg-bms.wg-bms-pointer-drag * { cursor:grabbing !important; user-select:none !important; }
.wg-bms .wg-bms-dragging { opacity:.45 !important; }
.wg-bms .wg-bms-drop { outline:1px solid #c8aa6e !important; outline-offset:-2px !important; background-color:#c8aa6e14 !important; }
@media (max-width:1100px) { .wg-bms .parties-game-type-card-category-div { padding:6px 10px !important; } }
`;

const cleanOrder = value => Array.isArray(value) ? [...new Set(value.filter(key => typeof key === 'string'))] : [];
const normalizeModeOrder = value => ({
    modes: cleanOrder(value?.modes),
    queues: Object.fromEntries(Object.entries(value?.queues && typeof value.queues === 'object' ? value.queues : {})
        .map(([key, order]) => [key, cleanOrder(order)])),
});

/** Reorder known entries while retaining temporarily hidden/unavailable queues. */
function reorderModeItems(saved, present, source, target) {
    const order = [...new Set([...cleanOrder(saved), ...present])];
    if (source === target || !present.includes(source) || !present.includes(target)) return order;
    const from = order.indexOf(source);
    const to = order.indexOf(target);
    order.splice(from, 1);
    order.splice(to, 0, source);
    return order;
}

/** CSS order preserves Ember ownership, queue selection, warnings and event handlers. */
function createBetterModeSelect({ document, storage, initial = {} }) {
    const win = document.defaultView;
    let state = normalizeModeOrder(storage?.get(BETTER_MODE_SELECT_KEY) ?? initial);
    const originals = new Map();
    const keys = new WeakMap();
    const shadowStyles = new Set();
    let drag = null;
    let pointer = null;
    let ghost = null;
    let suppressClickUntil = 0;
    let disposed = false;
    let resizeObserver;
    const style = document.createElement('style');
    style.dataset.wgBetterModeSelect = '';
    style.textContent = BETTER_MODE_SELECT_CSS;
    document.head.append(style);

    const remember = element => {
        if (!originals.has(element)) originals.set(element, {
            order: element.style.getPropertyValue('order'),
            priority: element.style.getPropertyPriority('order'),
            draggable: element.getAttribute('draggable'),
            variables: Object.fromEntries(LAYOUT_VARS.map(name => [name, element.style.getPropertyValue(name)])),
        });
    };
    const modeKey = card => {
        if (!keys.has(card)) {
            const map = card.getAttribute('data-map-id') ?? card.querySelector('[data-map-id]')?.getAttribute('data-map-id') ?? '';
            const mode = card.getAttribute('data-game-mode') ?? '';
            const identity = `${map}:${mode}`;
            // Some client variants expose Classic and Rift with the same map/mode.
            const duplicates = [...card.parentElement.children].filter(el => el.matches(CARD)
                && el.getAttribute('data-map-id') === card.getAttribute('data-map-id')
                && el.getAttribute('data-game-mode') === card.getAttribute('data-game-mode'));
            const queues = [...card.querySelectorAll('[data-queue-id]')].map(el => el.getAttribute('data-queue-id')).sort().join(',');
            keys.set(card, duplicates.length > 1 ? `${identity}:${queues}` : identity);
        }
        return keys.get(card);
    };
    const queueKey = item => {
        if (!keys.has(item)) {
            const queue = item.matches('[data-queue-id]') ? item : item.querySelector('[data-queue-id]');
            keys.set(item, queue ? `queue:${queue.getAttribute('data-queue-id')}`
                : `training:${[...item.parentElement.children].indexOf(item)}`);
        }
        return keys.get(item);
    };
    const applyOrder = (elements, order, keyOf) => {
        const all = [...new Set([...order, ...elements.map(keyOf)])];
        for (const element of elements) {
            remember(element);
            const next = String(all.indexOf(keyOf(element)));
            if (element.style.order !== next) element.style.setProperty('order', next);
        }
    };
    const cardsIn = root => [...root.querySelectorAll(CARD)].filter(card => card.closest(ROOT) === root);
    const queuesIn = container => [...container.children].filter(el => el.matches(ITEM));
    const sync = () => {
        if (disposed) return;
        for (const element of originals.keys()) if (!element.isConnected) {
            resizeObserver?.unobserve(element);
            originals.delete(element);
        }
        for (const sheet of shadowStyles) if (!sheet.isConnected) shadowStyles.delete(sheet);
        for (const root of document.querySelectorAll(ROOT)) {
            if (!root.classList.contains('wg-bms')) root.classList.add('wg-bms');
            remember(root);
            resizeObserver?.observe(root);
            const cards = cardsIn(root);
            const rect = root.getBoundingClientRect();
            if (rect.width > 0) {
                const footer = root.closest('.parties-game-select-screen')?.querySelector('.confirm-section, .game-select-footer-container .arrow-footer');
                const footerTop = footer?.getBoundingClientRect().top;
                const bottom = footerTop > rect.top ? footerTop : win.innerHeight - 60;
                const available = Math.max(140, bottom - rect.top - 10);
                const header = Math.min(230, Math.max(100, Math.floor(available * .46)));
                const visible = cards.filter(card => !card.classList.contains('wg-dq-hidden') && win.getComputedStyle(card).display !== 'none').length || 1;
                const cardWidth = (rect.width - (visible - 1) * 12) / visible;
                const values = {
                    '--wg-bms-header-height': `${header}px`,
                    '--wg-bms-lower-height': `${Math.max(30, Math.floor(available - header - 30))}px`,
                    '--wg-bms-columns': String(Math.max(1, Math.min(3, Math.floor((rect.width - 48) / 220)))),
                    '--wg-bms-icon-size': `${Math.max(40, Math.min(105, Math.floor(header * .44), Math.floor(cardWidth - 16)))}px`,
                    '--wg-bms-title-size': `${Math.max(12, Math.min(24, Math.floor(cardWidth * .12), Math.floor(header * .105)))}px`,
                };
                for (const [name, value] of Object.entries(values)) {
                    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
                }
            }
            applyOrder(cards, state.modes, modeKey);
            for (const card of cards) {
                const upper = card.querySelector(UPPER);
                if (upper) { remember(upper); if (upper.draggable !== true) upper.draggable = true; }
                for (const container of card.querySelectorAll(QUEUES)) {
                    // UIKit places the light-DOM categories inside a shadow slot.
                    if (container.shadowRoot && !container.shadowRoot.querySelector('[data-wg-bms-grid]')) {
                        const sheet = document.createElement('style');
                        sheet.dataset.wgBmsGrid = '';
                        sheet.textContent = ':host{display:block!important} slot{display:grid!important;grid-template-columns:repeat(var(--wg-bms-columns,3),minmax(0,1fr))!important;gap:12px 0!important}';
                        container.shadowRoot.append(sheet);
                        shadowStyles.add(sheet);
                    }
                    const items = queuesIn(container);
                    applyOrder(items, state.queues[modeKey(card)] ?? [], queueKey);
                    for (const item of items) if (item.draggable !== false || item.getAttribute('draggable') !== 'false') item.draggable = false;
                }
            }
        }
    };
    const describe = target => {
        const root = target?.closest?.(`${ROOT}.wg-bms`);
        if (!root) return null;
        const item = target.closest(ITEM);
        if (item && item.closest(`${CARD}.selected`)) return { element:item, kind:'queue', root, owner:item.closest(QUEUES), mode:modeKey(item.closest(CARD)), key:queueKey(item) };
        const upper = target.closest(UPPER);
        const card = upper?.closest(CARD);
        return card ? { element:card, kind:'mode', root, owner:card.parentElement, key:modeKey(card) } : null;
    };
    const describeEvent = event => {
        const path = [...(event.composedPath?.() ?? []), event.target];
        for (const node of path) {
            const item = describe(node);
            if (item) return item;
        }
        if (drag?.kind !== 'queue') return null;
        // UIKit can retarget drag events to its shadow slot/scrollable host.
        // Grid gaps also belong to the container, rather than a queue item.
        const lower = path.map(node => node?.closest?.('.parties-game-type-lower-half')).find(Boolean);
        const card = lower?.closest(`${CARD}.selected`);
        const root = card?.closest(ROOT);
        if (!card || root !== drag.root || modeKey(card) !== drag.mode) return null;
        const owner = card.querySelector(QUEUES);
        if (!owner) return null;
        let nearest = null;
        let distance = Infinity;
        for (const element of queuesIn(owner)) {
            const rect = element.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0 || element.classList.contains('wg-dq-hidden') || win.getComputedStyle(element).display === 'none') continue;
            const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
            const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
            const nextDistance = dx * dx + dy * dy;
            if (nextDistance < distance) { nearest = element; distance = nextDistance; }
        }
        return nearest ? { element:nearest, kind:'queue', root, owner, mode:drag.mode, key:queueKey(nearest) } : null;
    };
    const clearDrag = () => {
        document.querySelectorAll('.wg-bms-dragging,.wg-bms-drop').forEach(el => el.classList.remove('wg-bms-dragging','wg-bms-drop'));
        document.querySelectorAll('.wg-bms-pointer-drag').forEach(el => el.classList.remove('wg-bms-pointer-drag'));
        if (pointer?.captured) {
            try { pointer.source.element.releasePointerCapture(pointer.id); } catch { /* Native rerender may detach the source. */ }
        }
        pointer = null;
        ghost?.remove();
        ghost = null;
        drag = null;
    };
    const compatible = target => drag && target && target.kind === drag.kind && target.root === drag.root
        && (drag.kind === 'queue' ? target.mode === drag.mode : target.owner === drag.owner);
    const onStart = event => {
        const item = describeEvent(event);
        if (!item) return;
        if (item.kind === 'queue') { event.preventDefault(); return; }
        drag = item;
        item.element.classList.add('wg-bms-dragging');
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.key);
        }
    };
    const onOver = event => {
        const target = describeEvent(event);
        if (!compatible(target)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.wg-bms-drop').forEach(el => el.classList.remove('wg-bms-drop'));
        target.element.classList.add('wg-bms-drop');
    };
    const commitDrop = target => {
        if (!compatible(target)) return false;
        if (drag.kind === 'mode') {
            state.modes = reorderModeItems(state.modes, cardsIn(drag.root).map(modeKey), drag.key, target.key);
        } else {
            const mode = target.mode;
            state.queues[mode] = reorderModeItems(state.queues[mode], queuesIn(target.owner).map(queueKey), drag.key, target.key);
        }
        storage?.set(BETTER_MODE_SELECT_KEY, structuredClone(state));
        suppressClickUntil = Date.now() + 250;
        clearDrag();
        sync();
        return true;
    };
    const onDrop = event => {
        const target = describeEvent(event);
        if (!compatible(target)) return;
        event.preventDefault();
        event.stopPropagation();
        commitDrop(target);
    };
    const onEnd = () => { if (drag) suppressClickUntil = Date.now() + 250; clearDrag(); };
    const onClick = event => {
        if (Date.now() < suppressClickUntil && event.target.closest?.(`${ROOT}.wg-bms`)) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };
    const pointTarget = event => describeEvent({
        target: document.elementFromPoint(event.clientX, event.clientY),
        clientX: event.clientX, clientY: event.clientY,
    });
    const onPointerDown = event => {
        if (event.button !== 0 || pointer) return;
        const source = describeEvent(event);
        if (source?.kind !== 'queue') return;
        pointer = { id:event.pointerId, source, x:event.clientX, y:event.clientY, active:false, captured:false };
    };
    const onPointerMove = event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        if (!pointer.active) {
            if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 6) return;
            pointer.active = true;
            drag = pointer.source;
            drag.element.classList.add('wg-bms-dragging');
            drag.root.classList.add('wg-bms-pointer-drag');
            try { drag.element.setPointerCapture(pointer.id); pointer.captured = true; } catch { /* Document listeners still cover the viewport. */ }
            ghost = document.createElement('div');
            ghost.textContent = drag.element.querySelector('.queue-id, [data-queue-id]')?.textContent?.trim() ?? drag.element.textContent.trim();
            ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;padding:12px 16px;max-width:300px;background:#010a13ee;border:1px solid #c8aa6e;color:#f0e6d2;font:700 16px serif;box-shadow:0 4px 16px #0008;';
            document.body.append(ghost);
        }
        event.preventDefault();
        event.stopPropagation();
        ghost.style.left = `${event.clientX + 12}px`;
        ghost.style.top = `${event.clientY + 12}px`;
        const target = pointTarget(event);
        document.querySelectorAll('.wg-bms-drop').forEach(el => el.classList.remove('wg-bms-drop'));
        if (compatible(target)) target.element.classList.add('wg-bms-drop');
    };
    const onPointerUp = event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        if (!pointer.active) { pointer = null; return; }
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil = Date.now() + 250;
        const target = pointTarget(event);
        if (!commitDrop(target)) clearDrag();
    };
    const onPointerCancel = event => {
        if (pointer?.id !== event.pointerId) return;
        if (pointer.active) suppressClickUntil = Date.now() + 250;
        clearDrag();
    };
    const onKeyDown = event => {
        if (event.key === 'Escape' && pointer) { suppressClickUntil = Date.now() + 250; clearDrag(); }
    };
    const onBlur = () => { if (pointer) clearDrag(); };
    const events = { dragstart:onStart, dragover:onOver, drop:onDrop, dragend:onEnd, click:onClick,
        pointerdown:onPointerDown, pointermove:onPointerMove, pointerup:onPointerUp, pointercancel:onPointerCancel, keydown:onKeyDown };
    for (const [name, handler] of Object.entries(events)) document.addEventListener(name, handler, true);
    // Body observer integration handles navigation; polling covers shadow-root initialization.
    if (win.ResizeObserver) resizeObserver = new win.ResizeObserver(sync);
    const timer = win.setInterval(sync, 1000);
    win.addEventListener('resize', sync);
    win.addEventListener('blur', onBlur);
    sync();
    return {
        sync,
        dispose() {
            disposed = true;
            win.clearInterval(timer);
            win.removeEventListener('resize', sync);
            win.removeEventListener('blur', onBlur);
            resizeObserver?.disconnect();
            clearDrag();
            for (const [name, handler] of Object.entries(events)) document.removeEventListener(name, handler, true);
            for (const [element, original] of originals) {
                if (original.order) element.style.setProperty('order', original.order, original.priority);
                else element.style.removeProperty('order');
                for (const [name, value] of Object.entries(original.variables)) {
                    if (value) element.style.setProperty(name, value);
                    else element.style.removeProperty(name);
                }
                if (original.draggable === null) element.removeAttribute('draggable');
                else element.setAttribute('draggable', original.draggable);
            }
            originals.clear();
            document.querySelectorAll(`${ROOT}.wg-bms`).forEach(el => el.classList.remove('wg-bms'));
            shadowStyles.forEach(sheet => sheet.remove());
            shadowStyles.clear();
            style.remove();
        },
    };
}


const RUNTIME_KEY = Symbol.for('better-mode-select.runtime');
let runtime = null;
let waitingForDocument = false;

const storage = {
    get(key) {
        try {
            const saved = window.DataStore?.get(key);
            if (saved !== undefined && saved !== null) return saved;
        } catch (error) { console.warn('[Better Mode Select] Could not read Pengu storage.', error); }
        try { return JSON.parse(window.localStorage.getItem(key) ?? 'null'); }
        catch { return null; }
    },
    set(key, value) {
        try {
            if (window.DataStore?.set) { window.DataStore.set(key, value); return; }
        } catch (error) { console.warn('[Better Mode Select] Could not write Pengu storage.', error); }
        try { window.localStorage.setItem(key, JSON.stringify(value)); }
        catch (error) { console.warn('[Better Mode Select] Could not save the custom order.', error); }
    },
};

function start() {
    waitingForDocument = false;
    if (runtime || !document.body) return;
    window[RUNTIME_KEY]?.dispose();
    const selector = createBetterModeSelect({ document, storage });
    let frame = null;
    let stopped = false;
    const schedule = () => {
        if (stopped || frame !== null) return;
        frame = window.requestAnimationFrame(() => {
            frame = null;
            if (!stopped) selector.sync();
        });
    };
    const observer = new window.MutationObserver(schedule);
    observer.observe(document.body, { childList:true, subtree:true });
    const onPageHide = () => instance.dispose();
    const instance = {
        dispose() {
            if (stopped) return;
            stopped = true;
            observer.disconnect();
            if (frame !== null) window.cancelAnimationFrame(frame);
            window.removeEventListener('pagehide', onPageHide);
            selector.dispose();
            if (window[RUNTIME_KEY] === instance) delete window[RUNTIME_KEY];
            if (runtime === instance) runtime = null;
        },
    };
    runtime = instance;
    window[RUNTIME_KEY] = instance;
    window.addEventListener('pagehide', onPageHide);
}

export function init() {
    if (document.body) start();
    else if (!waitingForDocument) {
        waitingForDocument = true;
        document.addEventListener('DOMContentLoaded', start, { once:true });
    }
}

export function load() { init(); }

export function dispose() {
    document.removeEventListener('DOMContentLoaded', start);
    waitingForDocument = false;
    runtime?.dispose();
}
