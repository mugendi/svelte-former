# Svelte Former

[![github-license](https://img.shields.io/github/license/mugendi/https://github.com/mugendi/svelte-former?style=social&logo=github)](https://github.com/mugendi/https://github.com/mugendi/svelte-former) [![github-stars](https://img.shields.io/github/stars/mugendi/svelte-former?style=social&logo=github)](https://github.com/mugendi/svelte-former) [![github-watchers](https://img.shields.io/github/watchers/mugendi/svelte-former?label=Watch&style=social&logo=github)](https://github.com/mugendi/svelte-former) [![github-forks](https://img.shields.io/github/forks/mugendi/svelte-former?label=Fork&style=social&logo=github)](https://github.com/mugendi/svelte-former) 

This is a [svelte](https://svelte.dev/) from component that handles:
- Form creation
- Form validation using [Fastest Validator](https://www.npmjs.com/package/fastest-validator)
- Dynamic fields triggered by values in other fields
- Rich text (WISIWYG) editor via [SunEditor](https://github.com/JiHong88/SunEditor)

Since svelte is the [Magical disappearing framework](https://v2.svelte.dev/) that compiles into framework-less vanilla JavaScript, this component can also be used with ordinary JavaScript.

- [Documentation](/docs)
- [Demo](https://mugendi.github.io/docs/svelte-former/)

![Alt](https://repobeats.axiom.co/api/embed/83c6d10682a20b1614e5f64ab3c7a248babf15f1.svg "Repobeats analytics image")


# Why another form component?

I totally love [fastest-validator](https://www.npmjs.com/package/fastest-validator) especially because it is blazing fast and super easy to use. I wanted to create a forms component that would also be:
- Super fast
- Simple to use
- Ability to add custom validators with ease

I used and loved [Svelte Forms](https://github.com/chainlist/svelte-forms). However one of the features I wanted the most, and found it missing in other libraries is *Dynamic Fields*. **Svelte-Former** comes with the ability to *bind* two fields together so that changing the value in one field automatically updates another field. A good example is when creating *country* and *city* select boxes where selecting a country updates all the cities, say via an API. Check out the [Demo](https://mugendi.github.io/docs/svelte-former/) 


![Screenshot](/docs/assets/screenshot.png)

