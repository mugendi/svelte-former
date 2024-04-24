<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { capitaliseWord } from "../lib/utils";

  export let control;

  let classes = control.label && control.label.classes ? control.label.classes.join(" ") : "";
  let labelText;

  $: labelText =
    (control.label && control.label.text) ||
    control.label ||
    capitaliseWord(control.attributes.name);
    
</script>

<label class={classes} for={control.attributes.id}>
  <span>{labelText}</span>
</label>
