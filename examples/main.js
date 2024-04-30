/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

let controls = [
    {
        element: 'input',
        attributes: {
            name: 'one',
            value: 'One',
            min: '5',
        },
        classes: ['col-sm-12', 'col-md-6'],
        validation: {
            type: 'string',
            lowercase: true,
        },
        label: '<i>RRRR</i>',
        onChange: [
            {
                value: 'email',
                set: function () {
                    return {
                        rre: {
                            element: 'textarea',
                            attributes: {
                                type: 'email',
                                value: 'name@gmail.com',
                            },
                        },
                    };
                },
            },
        ],
    },
    {
        element: 'input',
        attributes: {
            name: 'rre',
            value: 'One',
        },
        classes: ['col-sm-12', 'col-md-6'],
        validation: {
            type: 'email',
            //
        },
        label: 'PEE',
    },
    {
        element: 'select',
        attributes: {
            name: 'two',
            //   required: true,
            // placeholder: 'select a value',
        },
        options: ['Radio 1', 'Radio 2'],
        classes: ['col-sm-12', 'col-md-6'],
        onChange: [
            {
                set: function (value) {
                    // console.log(this);
                    // console.log({ value });
                    let opts = { options: [] };

                    if (value == 'Radio 1') {
                        opts = {
                            options: [1, 5, 6, 7],
                            attributes: {
                                placeholder: 'Select Number',
                            },
                        };
                    } else if (value == 'Radio 2') {
                        opts = {
                            options: [100, 200, 300, 400],
                            attributes: {
                                placeholder: 'Select Number',
                            },
                        };
                    }

                    return {
                        sss: opts,
                    };
                },
            },
        ],
    },

    {
        element: 'select',
        attributes: {
            name: 'sss',
            //   required: true,Number
            // placeholder: 'Select ',
        },
        options: [],
        classes: ['col-sm-12', 'col-md-6'],
    },

    {
        element: 'input',
        attributes: {
            type: 'checkbox',
            name: 'three',
            required: true,
        },
    },
    {
        element: 'richtext',
        attributes: {
            name: 'txt',
            required: true,
        },
        validation: {
            max: 50,
            min: 10,
        },
    },
    {
        element: 'input',
        attributes: {
            type: 'hidden',
            name: 'four',
            required: true,
            value: 'ee',
        },
    },

    {
        element: 'div',
        content: '<h2>Help me</help>',
        // classes: ['one', 'two'],
    },
];




let s = new SvelteFormer({
    target: document.body,
    props: {
        controls,
        // action
        action: '',
        //  post
        method: 'post',
    },
});



