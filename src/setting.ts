export const initSetting = () => {
  logseq.useSettingsSchema([
    {
      key: "maxLength",
      type: "number",
      title: "Max Length",
      description: "The maximum length of the content to be displayed",
      default: 50
    }
  ])
}
