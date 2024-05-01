const classNameInserts = {};

function scratchClass(...classes) {
  if (!scratchAddons.classNames.loaded) throw new Error("Class names are not ready yet");

  let ret = [];
  for (const c of classes) {
    const result = scratchAddons.classNames.arr.find((e) => e.startsWith(c + "_") && e.length === c.length + 6);
    if (!result) {
      console.log(`Couldn't resolve scratch class "${c}"`);
      continue;
    }
    ret.push(result);
  }

  return ret;
}

function generateClassInserts() {
  classNameInserts["sa-ui-group"] = scratchClass("button-group_button-group");
  classNameInserts["sa-ui-button"] = scratchClass("button_button", "paint-editor_button-group-button");
  classNameInserts["sa-ui-image"] = scratchClass("paint-editor_button-group-button-icon");
}

export function createButton(attributes, listeners, ...children) {
  const { useButtonTag, ...attrs } = attributes;
  const el = createElement(
    useButtonTag ? "button" : "span",
    {
      role: "button",
      class: "sa-ui-button " + (attrs.class ?? ""),
      ...attrs,
    },
    ...children
  );
  for (var key in listeners) {
    el.addEventListener(key, listeners[key]);
  }
  return el;
}

export function createButtonImage(path, attributes) {
  return createElement("img", {
    class: "sa-ui-image",
    draggable: false,
    src: path,
    ...attributes,
  });
}

export function createGroup(...children) {
  return createElement("div", { class: "sa-ui-group" }, ...children);
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function createElement(tagName, attributes, ...children) {
  const { nameSpaceURI, dataSet, ...attrs } = attributes;
  const element = nameSpaceURI ? document.createElementNS(nameSpaceURI, tagName) : document.createElement(tagName);

  if (attrs.class) {
    const oldClasses = attrs.class instanceof Array ? attrs.class : attrs.class.split(/\s+/);
    let newClasses = oldClasses;
    for (const c of oldClasses) if (c in classNameInserts) newClasses = newClasses.concat(classNameInserts[c]);
    attrs.class = newClasses.join(" ");
  }

  for (var key in attrs) {
    if (attrs.hasOwnProperty(key)) {
      element.setAttribute(key, attrs[key]);
    }
  }

  for (var key in dataSet) {
    element.dataset[key] = dataSet[key];
  }

  element.append(...children);

  return element;
}

class UIElement {
  html;
}

export class Popup extends UIElement {
  constructor() {
    super();
    this.html = createElement("div", { class: "sa-ui-popup-wrapper" });
    this.page = createElement(
      "div",
      { class: "sa-ui-popup" },
      createElement(
        "svg",
        { nameSpaceURI: SVG_NS, class: "sa-ui-frame-tip", width: "14", height: "7" },
        createElement("polygon", { nameSpaceURI: SVG_NS, class: "sa-ui-frame-polygon", points: "0,0 7,7, 14,0" })
      )
    );
    this.html.appendChild(this.page);
  }

  isVisible() {
    return this.page.dataset.visible == "true";
  }

  setVisible(visible) {
    this.page.dataset.visible = visible;
  }

  append(...nodes) {
    this.page.append(...nodes);
  }
}

export class SettingsForm extends UIElement {
  constructor() {
    super();
    this.html = createElement("div", { class: "sa-ui-settings" });
    this.currentSection = [];
    this.initializers = [];
  }

  createSettingWithLabel(settingLabel, settingElem, initializer) {
    const container = createElement(
      "label",
      { class: "sa-ui-settings-line" },
      createElement("div", { class: "sa-ui-settings-label" }, settingLabel),
      settingElem
    );
    this.currentSection.push(container);

    this.initializers.push(() => initializer(settingElem));

    return this;
  }

  buildSection(title) {
    const isFirst = this.html.children.length == 0;

    this.html.append(
      ...(isFirst ? [] : [createElement("div", { class: "sa-ui-settings-separator" })]),
      createElement(
        "div",
        { class: "sa-ui-settings-section" },
        ...(title ? [createElement("span", { class: "sa-ui-settings-section-title" }, title)] : []),
        ...this.currentSection
      )
    );

    this.currentSection = [];
  }

  createSeparator() {
    this.html.append(createElement("div", { class: "sa-ui-settings-separator" }));
    return this;
  }

  update() {
    this.initializers.forEach((f) => {
      try {
        f?.();
      } catch {}
    });
  }
}

export class NumberInput extends UIElement {
  constructor(defaultValue, onChange = () => {}, min = -Infinity, max = Infinity, step = 1) {
    super();
    this.valueInput = createElement("input", {
      class: "sa-ui-settings-input",
      type: "number",
      step: step,
      min: min,
      max: max,
    });
    this.valueInput.value = defaultValue;
    this.valueInput.addEventListener("change", () => {
      if (this.valueInput.value > max) this.valueInput.value = max;
      if (this.valueInput.value < min) this.valueInput.value = min;
      onChange(this.valueInput.value);
    });
    this.valueInput.addEventListener("blur", () => {
      if (!this.valueInput.value) this.valueInput.value = "0";
    });

    this.valueButton = createButton(
      { useButtonTag: false },
      {
        change: () => {
          if (this.valueInput.value > max) this.valueInput.value = max;
          if (this.valueInput.value < min) this.valueInput.value = min;
          onChange(this.valueInput.value);
        },
        blur: () => {
          if (!this.valueInput.value) this.valueInput.value = "0";
        },
      },
      this.valueInput
    );
    this.valueButton.style.minWidth = "20px";
    this.valueButton.style.boxSizing = "content-box";

    this.decrementButton = createButton(
      {},
      {
        click: () => {
          if (this.valueInput.value > min) {
            this.valueInput.value = Number(this.valueInput.value) - 1;
            onChange(Number(this.valueInput.value) + 1);
          }
        },
      },
      createButtonImage(getIcon("decrement"))
    );

    this.incrementButton = createButton(
      {},
      {
        click: () => {
          if (this.valueInput.value < max) {
            this.valueInput.value = Number(this.valueInput.value) + 1;
            onChange(Number(this.valueInput.value) + 1);
          }
        },
      },
      createButtonImage(getIcon("increment"))
    );

    this.html = createGroup(this.decrementButton, this.valueButton, this.incrementButton);
  }

  setValue(value) {
    this.valueInput.value = value;
  }

  getValue() {
    return this.valueInput.value;
  }
}

export class ToggleSetting extends UIElement {
  constructor(values, button1Content, button2Content, defaultValue, onChange = () => {}) {
    super();
    this.values = values;
    this.onChange = onChange;

    this.buttons = [
      createButton(
        { useButtonTag: true },
        {
          click: () => this.setSelectedButton(0),
        },
        button1Content
      ),
      createButton(
        { useButtonTag: true },
        {
          click: () => this.setSelectedButton(1),
        },
        button2Content
      ),
    ];

    this.setSelectedValue(defaultValue);

    this.html = createGroup(...this.buttons);
  }

  setSelectedButton(which, suppress = false) {
    if (which < 0 || which >= this.buttons.length) return;
    this.selectedButton = which;
    this.buttons.forEach((b, i) => (b.dataset.enabled = which == i));
    if (!suppress) this.onChange(this.values[which]);
  }

  setSelectedValue(value, suppress = false) {
    this.setSelectedButton(this.values.indexOf(value), suppress);
  }

  getSelectedButton() {
    return this.selectedButton;
  }

  getSelectedValue() {
    return this.values[this.getSelectedButton()];
  }
}

function getIcon(iconName) {
  return `${new URL(import.meta.url).origin}/images/icons/${iconName}.svg`;
}

const oldAppend = Element.prototype.append;
Element.prototype.append = function (...nodes) {
  oldAppend.apply(
    this,
    nodes.map((n) => (n instanceof UIElement ? n.html : n))
  );
};
if (scratchAddons.classNames.loaded) generateClassInserts();
else window.addEventListener("scratchAddonsClassNamesReady", generateClassInserts, { once: true });
