/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

export let elementSchema = {
    type: 'string',
    optional: true,
    default: 'input',
    lowercase: true,
    enum: [
        'input',
        'textarea',
        'select',
        'richtext',
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

export let inputTypeSchema = {
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

export const controlSchema = {
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
        // checked: { type: 'boolean', optional: true },
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
