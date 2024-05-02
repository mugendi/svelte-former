/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */


!(async function () {


  let scripts = Array.from(document.querySelectorAll('script'))
    .map((s) => s.src)
    .filter((src) => /\/js\/examples\//.test(src));

  //   console.log(scripts);

  const response = await fetch(scripts[0]);
  const data = await response.text();

  const html = Prism.highlight(data, Prism.languages.javascript, 'javascript');

  let codeEl = document.querySelector('#code code');
  codeEl.innerHTML = html;

//   hljs.highlightAll();

  //   console.log(codeEl);
})();
