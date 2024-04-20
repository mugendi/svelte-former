<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  export let control;

  let classes = control.label && control.label.classes ? control.label.classes.join(" ") : "";
  let labelText = (control.label && control.label.text) || control.label || "";
</script>

<label class={classes} for={control.attributes.id}>
  <span>{labelText}</span>
</label>
