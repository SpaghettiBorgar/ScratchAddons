import { setSnapFrom, setSnapTo, snapOn, snapFrom, snapTo, toggle, threshold, setThreshold } from "./state.js";

import * as ui from "../../libraries/common/cs/ui-elems.js";

/** @type {import("../../addon-api/content-script/typedef").UserscriptUtilities} */
export function initUI({ addon, msg }) {
  const controlsGroup = ui.createGroup();
  addon.tab.displayNoneWhileDisabled(controlsGroup, {
    display: "flex",
  });

  const getIcon = (name) => {
    return addon.self.dir + "/icons/" + name + ".svg";
  };

  const settingsPopup = new ui.Popup();
  const settingsForm = new ui.SettingsForm();

  const toggleButton = ui.createButton(
    {
      title: msg("toggle"),
      dataSet: { enabled: snapOn },
    },
    {
      click: (e) => {
        if (!snapOn) {
          if (!Object.values(snapTo).some((e) => e)) setSnapTo("pageCenter", true);
          if (!Object.values(snapFrom).some((e) => e)) setSnapFrom("boxCenter", true);
        }
        toggle(!snapOn);
        e.currentTarget.dataset.enabled = snapOn;
      },
    },
    ui.createButtonImage(getIcon("snap"))
  );

  const settingsButton = ui.createButton(
    { title: msg("settings") },
    { click: () => setSettingsOpen(!areSettingsOpen()) },
    ui.createButtonImage(getIcon("settings"))
  );

  document.body.addEventListener("click", (e) => {
    if (areSettingsOpen() && !e.target.matches(".sa-ui-group *")) setSettingsOpen(false);
  });

  const setSettingsOpen = (open) => {
    settingsButton.dataset.enabled = open;
    settingsPopup.setVisible(open);
    if (open) settingsForm.update();
    else if (Object.values(snapFrom).every((e) => !e) || Object.values(snapTo).every((e) => !e)) {
      toggle(false);
      toggleButton.dataset.enabled = false;
    }
  };
  const areSettingsOpen = () => settingsPopup.isVisible();

  settingsForm.createSettingWithLabel(
    msg("threshold"),
    new ui.NumberInput(threshold, (value) => setThreshold(value), 4, 50, 1),
    (e) => e.setValue(threshold)
  );
  settingsForm.buildSection();

  const toOnOff = (bool) => (bool ? "on" : "off");
  const toBool = (onOff) => !!["off", "on"].indexOf(onOff);

  function createSnapSetting(toOrFrom, key) {
    settingsForm.createSettingWithLabel(
      msg(key),
      new ui.ToggleSetting(
        ["off", "on"],
        ui.createButtonImage(getIcon("off"), { dataSet: { shrink: true } }),
        ui.createButtonImage(getIcon("on"), { dataSet: { shrink: true } }),
        toOnOff((toOrFrom ? snapFrom : snapTo)[key]),
        (value) => (toOrFrom ? setSnapFrom : setSnapTo)(key, toBool(value))
      ),
      (e) => e.setSelectedValue(toOnOff((toOrFrom ? snapFrom : snapTo)[key]))
    );
  }

  for (const key in snapTo) createSnapSetting(false, key);
  settingsForm.buildSection(msg("snapTo"));

  for (const key in snapFrom) createSnapSetting(true, key);
  settingsForm.buildSection(msg("snapFrom"));

  settingsPopup.append(settingsForm);

  controlsGroup.append(settingsPopup, toggleButton, settingsButton);

  const controlsLoop = async () => {
    while (true) {
      const canvasControls = await addon.tab.waitForElement("[class^='paint-editor_canvas-controls']", {
        markAsSeen: true,
        reduxEvents: [
          "scratch-gui/navigation/ACTIVATE_TAB",
          "scratch-gui/mode/SET_PLAYER",
          "fontsLoaded/SET_FONTS_LOADED",
          "scratch-gui/locales/SELECT_LOCALE",
          "scratch-gui/targets/UPDATE_TARGET_LIST",
        ],
        reduxCondition: (state) =>
          state.scratchGui.editorTab.activeTabIndex === 1 && !state.scratchGui.mode.isPlayerOnly,
      });
      addon.tab.appendToSharedSpace({
        space: "paintEditorZoomControls",
        element: controlsGroup,
        order: 2,
      });
    }
  };
  controlsLoop();
}
