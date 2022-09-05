var Gantt = (function() {
    'use strict';

    const YEAR = 'year';
    const MONTH = 'month';
    const DAY = 'day';
    const HOUR = 'hour';
    const MINUTE = 'minute';
    const SECOND = 'second';
    const MILLISECOND = 'millisecond';

    /* CREAMOS NUESTRAS PROPIA VARIABLES GLOBALES */

    var GenerateArrow = false; // VARIABLE PARA SABER SI ESTAMOS GENERANDO UNA FLECHA DINAMICA.
    var CircleOutputArrow = null; // VARIABLE PARA ALMACENAR EL ELEMENTO.
    var GanttGeneral = null; // VARIABLE PARA ALMACENAR EL ELEMENTO GANTT GENERAL. IMPORTANTE
    var ElementListener = null; // ALMACENAMOS LA VARIABLE HTML DE ENTRADA DE LA CONEXIÓN.
    var dependenciesFather = null; // AQUI GUARDAREMOS LOS PADRES PARA SABER SI CREARLO CON EL MOUSELEAVE.
    var ArrayEncendidos = []; // DECLARAMOS ARREGLO VACIO
    var indice = 1; // VARIABLE PARA GENERAR LOS NUEVOS ID;
    var options = null;
    var FirstTime = true;
    var Change = false;

    /********************************************************/


    const month_names = {
        en: [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ],
        es: [
            'Ene',
            'Feb',
            'Mar',
            'Abr',
            'May',
            'Jun',
            'Jul',
            'Ago',
            'Sep',
            'Oct',
            'Nov',
            'Dic',
        ],
        ru: [
            'Январь',
            'Февраль',
            'Март',
            'Апрель',
            'Май',
            'Июнь',
            'Июль',
            'Август',
            'Сентябрь',
            'Октябрь',
            'Ноябрь',
            'Декабрь',
        ],
        ptBr: [
            'Janeiro',
            'Fevereiro',
            'Março',
            'Abril',
            'Maio',
            'Junho',
            'Julho',
            'Agosto',
            'Setembro',
            'Outubro',
            'Novembro',
            'Dezembro',
        ],
        fr: [
            'Janvier',
            'Février',
            'Mars',
            'Avril',
            'Mai',
            'Juin',
            'Juillet',
            'Août',
            'Septembre',
            'Octobre',
            'Novembre',
            'Décembre',
        ],
        tr: [
            'Ocak',
            'Şubat',
            'Mart',
            'Nisan',
            'Mayıs',
            'Haziran',
            'Temmuz',
            'Ağustos',
            'Eylül',
            'Ekim',
            'Kasım',
            'Aralık',
        ],
        zh: [
            '一月',
            '二月',
            '三月',
            '四月',
            '五月',
            '六月',
            '七月',
            '八月',
            '九月',
            '十月',
            '十一月',
            '十二月',
        ],
    };

    var date_utils = {
        parse(date, date_separator = '-', time_separator = /[.:]/) {
            if (date instanceof Date) {
                return date;
            }
            if (typeof date === 'string') {
                let date_parts, time_parts;
                const parts = date.split(' ');

                date_parts = parts[0]
                    .split(date_separator)
                    .map((val) => parseInt(val, 10));
                time_parts = parts[1] && parts[1].split(time_separator);

                // month is 0 indexed
                date_parts[1] = date_parts[1] - 1;

                let vals = date_parts;

                if (time_parts && time_parts.length) {
                    if (time_parts.length == 4) {
                        time_parts[3] = '0.' + time_parts[3];
                        time_parts[3] = parseFloat(time_parts[3]) * 1000;
                    }
                    vals = vals.concat(time_parts);
                }

                return new Date(...vals);
            }
        },

        to_string(date, with_time = false) {
            if (!(date instanceof Date)) {
                throw new TypeError('Invalid argument type');
            }
            const vals = this.get_date_values(date).map((val, i) => {
                if (i === 1) {
                    // add 1 for month
                    val = val + 1;
                }

                if (i === 6) {
                    return padStart(val + '', 3, '0');
                }

                return padStart(val + '', 2, '0');
            });
            const date_string = `${vals[0]}-${vals[1]}-${vals[2]}`;
            const time_string = `${vals[3]}:${vals[4]}:${vals[5]}.${vals[6]}`;

            return date_string + (with_time ? ' ' + time_string : '');
        },

        format(date, format_string = 'YYYY-MM-DD HH:mm:ss.SSS', lang = 'es') {
            const values = this.get_date_values(date).map((d) => padStart(d, 2, 0));
            const format_map = {
                YYYY: values[0],
                MM: padStart(+values[1] + 1, 2, 0),
                DD: values[2],
                HH: values[3],
                mm: values[4],
                ss: values[5],
                SSS: values[6],
                D: values[2],
                MMMM: month_names[lang][+values[1]],
                MMM: month_names[lang][+values[1]],
            };

            let str = format_string;
            const formatted_values = [];

            Object.keys(format_map)
                .sort((a, b) => b.length - a.length) // big string first
                .forEach((key) => {
                    if (str.includes(key)) {
                        str = str.replace(key, `$${formatted_values.length}`);
                        formatted_values.push(format_map[key]);
                    }
                });

            formatted_values.forEach((value, i) => {
                str = str.replace(`$${i}`, value);
            });

            return str;
        },

        diff(date_a, date_b, scale = DAY) {
            let milliseconds, seconds, hours, minutes, days, months, years;

            milliseconds = date_a - date_b;
            seconds = milliseconds / 1000;
            minutes = seconds / 60;
            hours = minutes / 60;
            days = hours / 24;
            months = days / 30;
            years = months / 12;

            if (!scale.endsWith('s')) {
                scale += 's';
            }

            return Math.floor({
                milliseconds,
                seconds,
                minutes,
                hours,
                days,
                months,
                years,
            }[scale]);
        },

        today() {
            const vals = this.get_date_values(new Date()).slice(0, 3);
            return new Date(...vals);
        },

        now() {
            return new Date();
        },

        add(date, qty, scale) {
            qty = parseInt(qty, 10);
            const vals = [
                date.getFullYear() + (scale === YEAR ? qty : 0),
                date.getMonth() + (scale === MONTH ? qty : 0),
                date.getDate() + (scale === DAY ? qty : 0),
                date.getHours() + (scale === HOUR ? qty : 0),
                date.getMinutes() + (scale === MINUTE ? qty : 0),
                date.getSeconds() + (scale === SECOND ? qty : 0),
                date.getMilliseconds() + (scale === MILLISECOND ? qty : 0),
            ];
            return new Date(...vals);
        },

        start_of(date, scale) {
            const scores = {
                [YEAR]: 6,
                [MONTH]: 5,
                [DAY]: 4,
                [HOUR]: 3,
                [MINUTE]: 2,
                [SECOND]: 1,
                [MILLISECOND]: 0,
            };

            function should_reset(_scale) {
                const max_score = scores[scale];
                return scores[_scale] <= max_score;
            }

            const vals = [
                date.getFullYear(),
                should_reset(YEAR) ? 0 : date.getMonth(),
                should_reset(MONTH) ? 1 : date.getDate(),
                should_reset(DAY) ? 0 : date.getHours(),
                should_reset(HOUR) ? 0 : date.getMinutes(),
                should_reset(MINUTE) ? 0 : date.getSeconds(),
                should_reset(SECOND) ? 0 : date.getMilliseconds(),
            ];

            return new Date(...vals);
        },

        clone(date) {
            return new Date(...this.get_date_values(date));
        },

        get_date_values(date) {
            return [
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
                date.getMilliseconds(),
            ];
        },

        get_days_in_month(date) {
            const no_of_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

            const month = date.getMonth();

            if (month !== 1) {
                return no_of_days[month];
            }

            // Feb
            const year = date.getFullYear();
            if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) {
                return 29;
            }
            return 28;
        },
    };

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    function padStart(str, targetLength, padString) {
        str = str + '';
        targetLength = targetLength >> 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (str.length > targetLength) {
            return String(str);
        } else {
            targetLength = targetLength - str.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
            }
            return padString.slice(0, targetLength) + String(str);
        }
    }

    function $(expr, con) {
        return typeof expr === 'string' ?
            (con || document).querySelector(expr) :
            expr || null;
    }

    function createSVG(tag, attrs) {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (let attr in attrs) {
            if (attr === 'append_to') {
                const parent = attrs.append_to;
                parent.appendChild(elem);
            } else if (attr === 'innerHTML') {
                elem.innerHTML = attrs.innerHTML;
            } else {
                elem.setAttribute(attr, attrs[attr]);
            }
        }
        return elem;
    }

    function createHtmlToSvg(tag, attrs) {
        const elem = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
        for (let attr in attrs) {
            if (attr === 'append_to') {
                const parent = attrs.append_to;
                parent.appendChild(elem);
            } else if (attr === 'innerHTML') {
                elem.innerHTML = attrs.innerHTML;
            } else {
                elem.setAttribute(attr, attrs[attr]);
            }
        }
        return elem;
    }

    function animateSVG(svgElement, attr, from, to) {
        const animatedSvgElement = getAnimationElement(svgElement, attr, from, to);

        if (animatedSvgElement === svgElement) {
            // triggered 2nd time programmatically
            // trigger artificial click event
            const event = document.createEvent('HTMLEvents');
            event.initEvent('click', true, true);
            event.eventName = 'click';
            animatedSvgElement.dispatchEvent(event);
        }
    }

    function getAnimationElement(
        svgElement,
        attr,
        from,
        to,
        dur = '0.4s',
        begin = '0.1s'
    ) {
        const animEl = svgElement.querySelector('animate');
        if (animEl) {
            $.attr(animEl, {
                attributeName: attr,
                from,
                to,
                dur,
                begin: 'click + ' + begin, // artificial click
            });
            return svgElement;
        }

        const animateElement = createSVG('animate', {
            attributeName: attr,
            from,
            to,
            dur,
            begin,
            calcMode: 'spline',
            values: from + ';' + to,
            keyTimes: '0; 1',
            keySplines: cubic_bezier('ease-out'),
        });
        svgElement.appendChild(animateElement);

        return svgElement;
    }

    function cubic_bezier(name) {
        return {
            ease: '.25 .1 .25 1',
            linear: '0 0 1 1',
            'ease-in': '.42 0 1 1',
            'ease-out': '0 0 .58 1',
            'ease-in-out': '.42 0 .58 1',
        }[name];
    }

    $.on = (element, event, selector, callback) => {
        if (!callback) {
            callback = selector;
            $.bind(element, event, callback);
        } else {
            $.delegate(element, event, selector, callback);
        }
    };

    $.off = (element, event, handler) => {
        element.removeEventListener(event, handler);
    };

    $.bind = (element, event, callback) => {
        event.split(/\s+/).forEach(function(event) {
            element.addEventListener(event, callback);
        });
    };

    $.delegate = (element, event, selector, callback) => {
        element.addEventListener(event, function(e) {
            const delegatedTarget = e.target.closest(selector);
            if (delegatedTarget) {
                e.delegatedTarget = delegatedTarget;
                callback.call(this, e, delegatedTarget);
            }
        });
    };

    $.closest = (selector, element) => {
        if (!element) return null;

        if (element.matches(selector)) {
            return element;
        }

        return $.closest(selector, element.parentNode);
    };

    $.attr = (element, attr, value) => {
        if (!value && typeof attr === 'string') {
            return element.getAttribute(attr);
        }

        if (typeof attr === 'object') {
            for (let key in attr) {
                $.attr(element, key, attr[key]);
            }
            return;
        }

        element.setAttribute(attr, value);
    };

    class Bar {
        constructor(gantt, task) {
            this.set_defaults(gantt, task);
            this.prepare();
            this.draw();
            this.bind();
        }

        set_defaults(gantt, task) {
            this.action_completed = false;
            this.gantt = gantt;
            this.task = task;
        }

        prepare() {
            this.prepare_values();
            this.prepare_helpers();
        }

        prepare_values() {
            /* VALORES PARA MOVILIDAD */
            this.CircleInput = '';
            this.CircleInputTag = '';
            this.Line = '';
            this.LineTag = '';
            this.CircleOutput = '';
            this.CircleOutputTag = '';
            /*************************** */
            this.invalid = this.task.invalid;
            this.height = this.gantt.options.bar_height;
            this.x = this.compute_x();
            this.y = this.compute_y();
            this.corner_radius = this.gantt.options.bar_corner_radius;
            if (FirstTime || !Change) {
                this.duration =
                    date_utils.diff(this.task._end, this.task._start, 'hour') /
                    this.gantt.options.step;
            } else {
                this.duration =
                    date_utils.diff(this.task._end, this.task._start, 'hour') /
                    this.gantt.options.step;

            }

            this.width = this.gantt.options.column_width * this.duration;
            this.progress_width =
                this.gantt.options.column_width *
                this.duration *
                (100 / 100) || 0; //this.task.progress
            this.group = createSVG('g', {
                class: 'bar-wrapper ' + (this.task.custom_class || ''),
                'data-id': this.task.id,
            });

            this.bar_group = createSVG('g', {
                class: 'bar-group',
                append_to: this.group,
            });
            this.handle_group = createSVG('g', {
                class: 'handle-group',
                append_to: this.group,

            }); // SE CREA EL ELEMENTO PARA AGREGAR LOS HANDLE
        }

        prepare_helpers() {
            SVGElement.prototype.getX = function() {
                return +this.getAttribute('x');
            };
            SVGElement.prototype.getY = function() {
                return +this.getAttribute('y');
            };
            SVGElement.prototype.getWidth = function() {
                return +this.getAttribute('width');
            };
            SVGElement.prototype.getHeight = function() {
                return +this.getAttribute('height');
            };
            SVGElement.prototype.getEndX = function() {
                return this.getX() + this.getWidth();
            };
        }

        draw() {
            this.draw_bar();
            this.draw_label();
            this.draw_resize_handles();
        }

        draw_bar() {




            /*CREAMOS EL LIENZO PARA LOS CIRCULOS DE CONEXIÓN*/
            //this.draw_progress_bar();

            if (this.task.Father) {

                this.CircleInput = 'CircleInput father';
                this.CircleInputTag = '.CircleInput.father';


            } else {
                this.CircleInput = 'CircleInput son';
                this.CircleInputTag = '.CircleInput.son';
            }


            this.$bar = createSVG('circle', {
                cx: this.x,
                cy: this.y + this.height / 2,
                r: 5,
                class: this.CircleInput,
                append_to: this.bar_group,
            });




            if (this.task.Father) {

                this.CircleOutputTag = '.CircleOutput.father';
                this.CircleOutput = 'CircleOutput father';
                this.Line = 'Line father';
                this.LineTag = '.Line.father';


            } else {
                this.CircleOutput = 'CircleOutput son';
                this.CircleOutputTag = '.CircleOutput.son';
                this.Line = 'Line son';
                this.LineTag = '.Line.son';
            }




            this.$bar = createSVG('line', {
                x1: this.x + this.width,
                x2: this.x + this.width + 5,
                y1: this.y + this.height / 2,
                y2: this.y + this.height / 2,
                class: this.Line,
                append_to: this.bar_group,
            });



            this.$bar = createSVG('circle', {
                cx: this.x + this.width + 10,
                cy: this.y + this.height / 2,
                r: 4,
                class: this.CircleOutput,
                append_to: this.bar_group,
            });





            var name_class;
            if (this.task.Father) {

                name_class = 'bar father';

            } else {
                name_class = 'bar son';
            }

            this.$bar = createSVG('rect', {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height,
                rx: this.corner_radius,
                ry: this.corner_radius,
                class: name_class,
                append_to: this.bar_group,
            });



            // animateSVG(this.$bar, 'width', 0, this.width);

            /*************GENERAMOS EL LISTENER PARA LOS HANDLERS**********************/
            if (this.task.name != '') {
                console.log('causa especial');
                this.handle_group.addEventListener('mouseover', MouseOverHandler, false);
                this.handle_group.addEventListener('mouseleave', MouseLeaveHandler, false);
                this.bar_group.addEventListener('mouseover', MouseOverHandler, false);
                this.bar_group.addEventListener('mouseleave', MouseLeaveHandler, false);
                //this.handle_group.addEventListener('mouseover', MouseOverNodo, false);
                //this.handle_group.addEventListener('mouseleave', MouseLeaveNodo, false);
            } else {
                this.bar_group.childNodes[0].style.visibility = 'hidden';
                this.bar_group.childNodes[1].style.visibility = 'hidden';
                this.bar_group.childNodes[2].style.visibility = 'hidden';
            }


            /*************************************************************************/

            /***************GENERAMOS EL LISTENER DEL BOX**************************** */
            //this.handle_group.addEventListener('mouseover', MouseOver, false);
            if (this.task.name != '') {


                if ((this.gantt.dependency_map[this.task.id] != undefined && this.task.Father)) {
                    // SI ES UN PADRE Y TIENE TAREAS RELACIONADAS PRIMERO LE ACTIVAMOS EL MOUSEOVER PERO TOCA PENSAR SI HACER
                    // LO MISMO CON EL MAUSE LEAVE PUESTO QUE SI ES UN PADRE LA IDEA ES DEJARLO QUIETO
                    this.bar_group.addEventListener('mouseover', MouseOver, false); // ACTIVAMOS EL MOUSE OVER 


                    if (dependenciesFather == null) {
                        console.log('CASUA 3');
                        this.bar_group.addEventListener('mouseleave', MouseLeave, false);

                    } else {
                        if (!dependenciesFather.includes(this.task.id)) {
                            console.log('CASUA 4');
                            this.bar_group.addEventListener('mouseleave', MouseLeave, false);
                        } else {


                            /* DEJAMOS LOS PINES DE LOS PADRES COLOCADOS CORRECTAMENTE */
                            var LLavesPadres = Object.keys(GanttGeneral.dependency_map);
                            var PadresConnection = GanttGeneral.dependency_map;
                            var VariableBandera = false;
                            for (var i = 0; i < GanttGeneral.tasks.length; i++) {

                                if (GanttGeneral.tasks[i].Father && PadresConnection[GanttGeneral.tasks[i].id] != null) {
                                    if (PadresConnection[this.task.id].includes(GanttGeneral.tasks[i].id)) {
                                        VariableBandera = true;
                                        break;
                                    }

                                }

                            }
                            if (!VariableBandera) {
                                console.log('CASUA 5');
                                this.bar_group.addEventListener('mouseleave', MouseLeave, false);
                            }




                        }


                    }
                } else {


                    this.bar_group.addEventListener('mouseover', MouseOver, false);
                    if (GanttGeneral.dependency_map[this.task.id] == null | undefined) {
                        console.log('CASUA 6');
                        this.bar_group.addEventListener('mouseleave', MouseLeave, false);

                    }



                }
                /// SOLUCIONAR POR ACA OJOOOOOOOO
                if (this.task.Father && this.gantt.dependency_map[this.task.id] != null | undefined) {
                    /// MIRAMOS SI ES UN PADRE Y TIENE CONEXIONES MIRAMOS SI TAMBIEN SON PADRES O NO.
                    for (var i = 0; i < GanttGeneral.tasks.length; i++) {
                        if (GanttGeneral.tasks[i].Father && this.gantt.dependency_map[this.task.id].indexOf(GanttGeneral.tasks[i].id) != -1) {
                            this.bar_group.removeEventListener('mouseleave', MouseLeave, false);
                        }

                    }

                }

            }






            /*******************GENERAMOS EL LISTENER DE CLICK PARA LA FLECHA****************/
            function MouseOver(event) {
                var BarProgress = event.path[1]; // OBTENEMOS EL CONTENEDOR
                var CircleOutput = BarProgress.getElementsByClassName('CircleOutput');
                var Line = BarProgress.getElementsByClassName('Line');
                //CAMBIAMOS PROPIEDADES
                CircleOutput[0].style.opacity = 1;
                Line[0].style.opacity = 1;

            }

            function MouseOverNodo(event) {
                var BarProgress = event.path[2].childNodes[0]; // OBTENEMOS EL CONTENEDOR
                var CircleOutput = BarProgress.getElementsByClassName('CircleOutput');
                var Line = BarProgress.getElementsByClassName('Line');
                //CAMBIAMOS PROPIEDADES
                CircleOutput[0].style.opacity = 1;
                Line[0].style.opacity = 1;


            }

            function MouseLeaveNodo(event) {
                var BarProgress = event.path[2].childNodes[0]; // OBTENEMOS EL CONTENEDOR
                var CircleOutput = BarProgress.getElementsByClassName('CircleOutput');
                var Line = BarProgress.getElementsByClassName('Line');
                //CAMBIAMOS PROPIEDADES
                CircleOutput[0].style.opacity = 0;
                Line[0].style.opacity = 0;


            }



            function MouseOverHandler(event) {
                var RightHandler = event.path[2].childNodes[1].childNodes[0]; // OBTENEMOS EL CONTENEDOR
                var leftHandler = event.path[2].childNodes[1].childNodes[1];
                RightHandler.style.opacity = 1;
                leftHandler.style.opacity = 1;


            }


            function MouseLeave(event) {
                var BarProgress = event.path[1]; // OBTENEMOS EL CONTENEDOR
                var CircleOutput = BarProgress.getElementsByClassName('CircleOutput');
                var Line = BarProgress.getElementsByClassName('Line');
                //CAMBIAMOS PROPIEDADES
                if (CircleOutput[0].style.fill == "red") {
                    console.log('ARREGLADO PBS');
                    CircleOutput[0].style.opacity = 1;
                    Line[0].style.opacity = 1;

                } else {

                    CircleOutput[0].style.opacity = 0;
                    Line[0].style.opacity = 0;

                }

            }

            function MouseLeaveHandler(event) {
                var RightHandler = event.path[1].childNodes[1].childNodes[0]; // OBTENEMOS EL CONTENEDOR
                var leftHandler = event.path[1].childNodes[1].childNodes[1];
                RightHandler.style.opacity = 0;
                leftHandler.style.opacity = 0;

            }

            function ClickArrowStart(event) {
                event.path[1].removeEventListener('mouseleave', MouseLeave, false); // DEJAMOS FIJO LA FLECHA
            }

            function ClickArrowEnd(event) {

            }
            if (this.task.name != '') {
                this.bar_group.getElementsByClassName('CircleOutput')[0].addEventListener('click', (event) => {
                    console.log('PONEMOS FIJO LA CONEXIÓN.');
                    event.path[1].removeEventListener('mouseleave', MouseLeave, false); // DEJAMOS FIJO LA FLECHA
                    console.log(event.path[1]);
                    console.log('PONEMOS FIJO LA CONEXIÓN2.');
                    ElementListener = event.path[1];
                    if (GenerateArrow) {
                        event.path[1].removeEventListener('mouseleave', MouseLeave, false); // DEJAMOS FIJO LA FLECHA
                        console.log('opcion 1');
                        return;
                    }

                    var length_bars = GanttGeneral.bars.length; // GUARDAMOS TAMAÑO DEL ARREGLO PARA EL FOR



                    if (this.task.Father) {

                        for (var i = 0; i < length_bars; i++) {
                            //SOLO MOSTRAMOS LAS PADRES EN CASO DE SER TARJETAS PADRE...
                            if (GanttGeneral.bars[i].task.id != this.task.id) {
                                if (GanttGeneral.bars[i].task.Father) {

                                    if (!GanttGeneral.bars[i].task.dependencies.includes(this.task.id) && GanttGeneral.bars[i].task.name != '' &&
                                        !this.task.dependencies.includes(GanttGeneral.bars[i].task.id)) {

                                        GanttGeneral.bars[i].bar_group.childNodes[0].style.opacity = 1;
                                        GanttGeneral.bars[i].bar_group.childNodes[0].style.fill = 'red';
                                        //ArrayEncendidos.push(GanttGeneral.bars[i].bar_group.childNodes[0]);
                                        ArrayEncendidos.push(GanttGeneral.bars[i]);
                                        //console.log(GanttGeneral.bars[i]);

                                    }

                                }

                            }

                        }

                    } else {
                        for (var i = 0; i < length_bars; i++) {
                            // SOLO MOSTRAMOS LOS HIJOS EN CASO DE SER TARJETA HIJOS...
                            if (GanttGeneral.bars[i].task.id != this.task.id) {
                                if (!GanttGeneral.bars[i].task.Father && GanttGeneral.bars[i].task.name != '' && !this.task.dependencies.includes(GanttGeneral.bars[i].task.id)) {
                                    if (!GanttGeneral.bars[i].task.dependencies.includes(this.task.id)) {
                                        GanttGeneral.bars[i].bar_group.childNodes[0].style.opacity = 1;
                                        GanttGeneral.bars[i].bar_group.childNodes[0].style.fill = 'red';
                                        ArrayEncendidos.push(GanttGeneral.bars[i]);
                                        //console.log(GanttGeneral.bars[i].bar_group);

                                    }


                                }

                            }

                        }

                    }
                    /****************************ELIMINAMOS LA OPCIÓN DE LOS QUE YA ESTAN CONECTADOS A EL. ************************************/

                    var ListaDependenciasPadres = Object.keys(GanttGeneral.dependency_map); // OBTENEMOS LAS LLAVES DEL DICCIONARIO
                    for (var i = 0; i < ListaDependenciasPadres.length; i++) {
                        var DetectorConectorPadres = GanttGeneral.dependency_map[ListaDependenciasPadres[i]].includes(this.task.id);
                        if (DetectorConectorPadres) {
                            for (var b = 0; b < length_bars; b++) {
                                // BUSCAMOS LOS PADRES ASOCIADOS Y NO LOS MOSTRAMOS...
                                if (GanttGeneral.bars[b].task.id === ListaDependenciasPadres[i]) {
                                    if (GanttGeneral.bars[b].bar_group.childNodes[0].style.opacity != 1) {
                                        GanttGeneral.bars[b].bar_group.childNodes[0].style.opacity = 0;
                                    }
                                    //GanttGeneral.bars[b].bar_group.childNodes[0].style.opacity = 0;
                                    GanttGeneral.bars[b].bar_group.childNodes[0].style.fill = 'black';



                                }



                            }


                        }
                    }
                    if (ArrayEncendidos.length == 0) {
                        alert('No tiene nodos de conexion permitidos...');
                        GenerateArrow = false;
                        console.log('entro 1');
                        this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "black";
                        this.bar_group.getElementsByClassName('CircleOutput')[0].style.opacity = 0;
                        this.bar_group.getElementsByClassName('Line')[0].style.opacity = 0;
                        event.path[1].addEventListener('mouseleave', MouseLeave, false);


                    } else {
                        /**************************************************************************** */
                        GenerateArrow = true; // PASAMOS LA VARIABLE PARA INDICAR QUE ESTAMOS EN ESTADO PARA CREAR UNA CONEXIÓN.
                        console.log('CONEXIÓN HABILITADA ESPERANDO NODO RECEPTOR...');
                        CircleOutputArrow = this; // ALMACENAMOS EL ELEMENTO ASOCIADO DE LA TAREA INICIAL.
                        this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "red";
                        //DESAPARECEMOS UNICAMENTE EL CIRCULO SI NO TIENE UNA CONEXIÓN PREVIA..
                        var ListaDependencias = Object.values(GanttGeneral.dependency_map) // OBTENEMOS LA LISTA DE VALORES DEL DEPENDENCY_MAP
                        var DetectorConector = false;
                        for (var i = 0; i < ListaDependencias.length; i++) {
                            DetectorConector = ListaDependencias[i].includes(this.task.id);
                            if (DetectorConector) {
                                break;
                            }
                        }
                        if (!DetectorConector) {
                            this.bar_group.getElementsByClassName('CircleInput')[0].style.opacity = 0;

                        }
                    }






                }, false);
            }

            //GENERAMOS EL LISTENER PARA LA CONEXIÓN FINAL DE CLICK PARA LA FLECHA.
            // this.bar_group.getElementsByClassName('CircleInput')[0].addEventListener('mouseover', (event) => {
            //     if (GenerateArrow) {
            //         this.bar_group.getElementsByClassName('CircleInput')[0].style.fill = "red";
            //     }

            // }, false)
            document.addEventListener('dblclick', (event) => {
                this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "#000";
                if (GenerateArrow) {
                    GenerateArrow = false;

                    for (var i = 0; i < ArrayEncendidos.length; i++) {
                        if (ArrayEncendidos[i].task.dependencies.length == 0) {
                            ArrayEncendidos[i].bar_group.childNodes[0].style.opacity = 0;
                            ArrayEncendidos[i].bar_group.childNodes[0].style.fill = 'black';
                        } else {
                            ArrayEncendidos[i].bar_group.childNodes[0].style.fill = 'black';

                        }
                    }
                    ArrayEncendidos = []; // VACIAMOS EL ARREGLO

                    if (!CircleOutputArrow.task.Father) {
                        //SI ES UN HIJO Y TIENE ALGUNA CONEXIÓN DEJO LOS MARCADORES
                        console.log('CASUA 1');
                        if (Object.keys(GanttGeneral.dependency_map).includes(CircleOutputArrow.task.id) == false) {
                            //SI NO EXISTE CONEXIÓN
                            CircleOutputArrow.bar_group.childNodes[2].style.opacity = 0;
                            CircleOutputArrow.bar_group.childNodes[2].style.fill = 'black';
                            CircleOutputArrow.bar_group.childNodes[1].style.opacity = 0;
                            CircleOutputArrow.bar_group.childNodes[1].style.fill = 'black';
                            CircleOutputArrow.bar_group.addEventListener('mouseleave', MouseLeave);

                        };

                    } else {

                        /* CREAMOS LISTA DE PADRES.id  */
                        var DejarEstado = false;
                        for (var i = 0; i < GanttGeneral.tasks.length; i++) {

                            if (GanttGeneral.tasks[i].Father && GanttGeneral.dependency_map[CircleOutputArrow.task.id] != null | undefined) {
                                if (GanttGeneral.dependency_map[CircleOutputArrow.task.id].includes(GanttGeneral.tasks[i].id)) {
                                    DejarEstado = true;
                                    break;
                                }
                            }
                        }
                        if (!DejarEstado) {

                            CircleOutputArrow.bar_group.childNodes[2].style.opacity = 0;
                            CircleOutputArrow.bar_group.childNodes[2].style.fill = 'black';
                            CircleOutputArrow.bar_group.childNodes[1].style.opacity = 0;
                            CircleOutputArrow.bar_group.childNodes[1].style.fill = 'black';
                            CircleOutputArrow.bar_group.addEventListener('mouseleave', MouseLeave);
                            console.log('CASUA 2');


                        }



                    }




                } else {
                    console.log('NO PASA NADA');
                }

            }, false)



            this.bar_group.getElementsByClassName('CircleInput')[0].addEventListener('click', (event) => {
                if (GenerateArrow) {
                    console.log('CONECTADA');
                    ArrayEncendidos = []; // VACIAMOS EL ARREGLO
                    CircleOutputArrow.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "#000";
                    /* GENERAMOS LA CONEXIÓN EN LOS DATOS */

                    //PRIMERO ENCONTRAMOS EL ID DE LA TAREA PADRE QUE TENEMOS ALMACENADA EN CIRCLEOUTPUTARROW
                    var Id_Tarea_Padre = CircleOutputArrow.task.id; // GUARDAMOS ID TAREA PADRE.
                    var Id_Tarea_hija = this.task.id; // GUARDAMOS ID TAREA HIJA.

                    // AHORA LO QUE DEBEMOS HACER ES ENCONTRAR LA TAREA HIJA PARA AFECTAR SUS DEPENDENCIAS.

                    for (var i = 0; i < this.gantt.tasks.length; i++) {
                        if (this.gantt.tasks[i].id == Id_Tarea_hija) {
                            this.gantt.tasks[i].dependencies.push(Id_Tarea_Padre);
                            var MapeoDependencias = this.gantt.dependency_map[Id_Tarea_Padre];
                            if (MapeoDependencias === undefined) {
                                this.gantt.dependency_map[Id_Tarea_Padre] = [];
                                this.gantt.dependency_map[Id_Tarea_Padre].push(Id_Tarea_hija);
                            } else {
                                this.gantt.dependency_map[Id_Tarea_Padre].push(Id_Tarea_hija);
                            }

                            // CREAR EN DEPENDENCIAS_MET LA UNION TAMBIEN 
                            //NO USAR LA FUNCIÓN SINO AGREGARLAS A LA LISTA 
                            dependenciesFather = Object.keys(this.gantt.dependency_map) // OBTENEMOS LAS LLAVES....

                            this.gantt.render();
                            break;
                        }
                    }




                    /***********************************************/
                    GenerateArrow = false // LA RESETEAMOS PARA QUE NO HAYAN MAS CONEXIONES.
                } else {
                    console.log('NO SE HA HABILITADO UNA CONEXIÓN...')
                }

            }, false);
            /**********************************************************************************/


            if (this.invalid) {
                this.$bar.classList.add('bar-invalid');
            }
        }

        draw_progress_bar() {
            if (this.invalid) return;

            this.$bar = createSVG('image', {
                href: 'dist/Imag/Grupo359.png',
                class: 'delete',
                x: this.x - 14, // YA QUE NO PODEMOS OBTENERLA DESDE AQUI LA CUADRAMOS ABAJO EN EL RESETEO
                y: this.y,
                width: 9,
                height: 9,
                append_to: this.bar_group,
            });


            // animateSVG(this.$bar_progress, 'width', 0, this.progress_width);
        }

        draw_label() {
            this.const_name_x = 15;
            this.const_date_x = 35;
            this.const_porcent = 2;
            this.const_icon_date = 2.2;
            this.bar_width_initial = this.width;
            var position_x = this.x + this.const_name_x;
            var ClassName;
            var ClassDate;
            var ClassBig;
            var UrlImag;




            if (this.task.Father) {
                ClassName = 'bar-label name';
                this.ClassName = '.bar-label.name'
                ClassDate = 'bar-label date';
                this.ClassDate = '.bar-label.date';
                ClassBig = 'bar-label BigCase';
                this.ClassBig = '.bar-label.BigCase';
                UrlImag = 'dist/Imag/date.png'

            } else {
                ClassName = 'bar-label nameSon';
                this.ClassName = '.bar-label.nameSon'
                ClassDate = 'bar-label dateSon';
                this.ClassDate = '.bar-label.dateSon';
                ClassBig = 'bar-label BigCaseSon';
                this.ClassBig = '.bar-label.BigCaseSon';
                UrlImag = 'dist/Imag/dategris.png';

            }
            //var TextName = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
            if (this.task.name == '') {
                createSVG('foreignObject', {
                    class: 'InputLabel',
                    x: position_x,
                    y: this.y + this.height / 15,
                    width: 185,
                    height: 70,
                    append_to: this.bar_group,
                });
                createHtmlToSvg('input', {
                        type: 'text',
                        height: '4px',
                        placeholder: 'Ingresa el nombre de la tarea',
                        class: 'inputName',
                        append_to: this.bar_group.getElementsByClassName('InputLabel')[0],
                    })
                    // GENERAMOS LISTENER PARA EL INPUT
                this.bar_group.getElementsByClassName('InputLabel')[0].getElementsByClassName('inputName')[0].addEventListener('keyup', function(event) {
                    if (event.keyCode === 13) {
                        //GanttGeneral.bars[0].bar_group.task.name=''
                        for (var i = 0; i < GanttGeneral.tasks.length; i++) {

                            var Input = GanttGeneral.bars[i].bar_group.childNodes[4].childNodes[0]
                            if (Input == event.path[0]) {

                                GanttGeneral.bars[i].task.name = event.path[0].value; // REEMPLAZAMOS EL NOMBRE

                                break; // SALIMOS DEL CICLO
                            }


                        }
                        //ACTUALIZAMOS EL TASK....
                        GanttGeneral.setup_tasks(GanttGeneral.tasks);

                        // // initialize with default view mode
                        GanttGeneral.change_view_mode();
                        GanttGeneral.bind_events();
                    }
                })
            } else {
                // SI YA TIENE UN NOMBRE NO CREA NINGUN INPUT SINO DIREMAMENTE EL TEXTO
                createSVG('text', {
                    innerHTML: this.task.name,
                    class: ClassName,
                    x: position_x,
                    y: this.y + this.height / 2.2,
                    width: 140,
                    height: 10,
                    append_to: this.bar_group,
                });
                /// CREAMOS LA X PARA MOSTRAR EN CASO DE ELIMINAR
            }





            //this.bar_group.getElementsByClassName(ClassName)[0].appendChild(TextName); // AGREGAMOS EL TIPO INPUT EN EL DATO









            this.task._end = date_utils.add(this.task._end, -1, 'second');

            createSVG('text', {
                innerHTML: date_utils.format(
                    this.task._start,
                    'DD-MMM'
                ) + ' / ' + date_utils.format(
                    this.task._end,
                    'DD-MMM'
                ),
                class: ClassDate,
                //x: this.x + this.width / 2,
                x: this.x + this.const_date_x,
                y: this.y + this.height / 1.3,
                append_to: this.bar_group,
            });
            /* CREAMOS IMAGEN */

            createSVG('image', {
                href: UrlImag,
                class: 'bar-label dateImage',
                x: this.x + this.const_name_x,
                y: this.y + this.height / 2 - (9 / 3),
                width: 9,
                heigth: 9,
                append_to: this.bar_group,
            });

            /* CREATE TEXT IN CASE OF BIG CLASS */

            createSVG('text', {
                innerHTML: '...',
                class: ClassBig,
                x: this.x,
                y: this.y + this.height / 1.8,
                append_to: this.bar_group,
            });
            if (this.task.name == '') {
                requestAnimationFrame(() => this.update_label_position_null());

            } else {
                requestAnimationFrame(() => this.update_label_position());

            }

            if (this.task.Father && this.task.name != '') {

                createSVG('image', {
                    href: 'dist/Imag/Grupo353.png',
                    class: 'bar-label InfoImage',
                    x: this.x + this.const_name_x + 50, // YA QUE NO PODEMOS OBTENERLA DESDE AQUI LA CUADRAMOS ABAJO EN EL RESETEO
                    y: this.y + this.height / 4 - (11 / 6),
                    width: 11,
                    heigth: 11,
                    append_to: this.bar_group,
                });
                /********GENERAMOS EL CLICK PARA EL BOTON DE INFO**************************/

                var ImagenInfo = this.bar_group.getElementsByClassName('bar-label InfoImage')[0];
                ImagenInfo.addEventListener('mouseover', (event) => {
                    this.show_popup();
                }, false);
                var ImagenInfo = this.bar_group.getElementsByClassName('bar-label InfoImage')[0];
                ImagenInfo.addEventListener('mouseleave', (event) => {
                    GanttGeneral.hide_popup();
                }, false);



                /**************************************************************************/
                createSVG('text', {
                    innerHTML: '%',
                    class: 'bar-label PorcentText',
                    x: this.x + (this.width / 2) + 50, // DEFINIMOS QUE SIEMPRE ESTE EN LA MITAD
                    y: this.y + this.height / 2.8, // MISMA ALTURA DEL TEXTO
                    append_to: this.bar_group,
                });
                createSVG('rect', {
                    x: (this.x + this.width / 2) + 43,
                    y: this.y + this.height / 2.2,
                    width: 20,
                    height: 15,
                    rx: 2,
                    ry: 2,
                    class: 'bar-label PorcentBox',
                    append_to: this.bar_group,
                });
                /* CREAMOS EL TEXTO DEL PORCENTAJE */
                this.PorcentValueConstant = 47;
                if (this.task.Porcent == 100) {
                    this.PorcentValueConstant = 45;
                }
                createSVG('text', {
                    innerHTML: this.task.Porcent,
                    class: 'bar-label PorcentValue',
                    x: this.x + (this.width / 2) + this.PorcentValueConstant, // DEFINIMOS QUE SIEMPRE ESTE EN LA MITAD
                    y: this.y + this.height / 1.4, // MISMA ALTURA DEL TEXTO
                    append_to: this.bar_group,
                });


                /* CREAMOS CONTENEDOR DE TAREAS */

                createSVG('text', {
                    innerHTML: 'tareas',
                    class: 'bar-label WorksText',
                    x: this.x + (this.width / 2) + 72, // DEFINIMOS QUE SIEMPRE ESTE EN LA MITAD
                    y: this.y + this.height / 2.8, // MISMA ALTURA DEL TEXTO
                    append_to: this.bar_group,
                });

                createSVG('rect', {
                    x: (this.x + this.width / 2) + 76,
                    y: this.y + this.height / 2.2,
                    width: 20,
                    height: 15,
                    rx: 2,
                    ry: 2,
                    class: 'bar-label WorksBox',
                    append_to: this.bar_group,
                });

                createSVG('text', {
                    innerHTML: 0,
                    class: 'bar-label WorksValue',
                    x: this.x + (this.width / 2) + 43, // DEFINIMOS QUE SIEMPRE ESTE EN LA MITAD
                    y: this.y + this.height / 1.4, // MISMA ALTURA DEL TEXTO
                    append_to: this.bar_group,
                });
                /* INSERTAMOS IMAGEN COMO BOTON Y SU RECT DE FONDO */
                createSVG('rect', {
                    x: this.x + this.width - 40,
                    y: this.y + this.height / 4.4,
                    width: 25,
                    height: 25,
                    rx: 4,
                    ry: 4,
                    class: 'bar-label TaskButtonBox',
                    append_to: this.bar_group,
                });


                createSVG('image', {
                    href: 'dist/Imag/Grupo354.png',
                    class: 'bar-label TaskButton',
                    x: this.x + this.width - 70,
                    y: this.y + (this.height / 2) - (70 / 2.25),
                    width: "70px",
                    height: "70px",
                    append_to: this.bar_group,
                });
                /********GENERAMOS EL CLICK PARA EL BOTON DE CREAR SUBTAREA...***************/

                var TaskCreate = this.bar_group.getElementsByClassName('bar-label TaskButton')[0];

                TaskCreate.addEventListener('click', (event) => {
                    var ArrayTaskId = []; // CREO UN ARREGLO VACIO PARA ALMACENAR LOS ID NORMALES

                    // CREO UN CICLO PARA GENERAR UN ID Y MIRAR SI ES UNICO PARA LA UNICA TAREA.

                    var task = {
                        start: this.task.start, // GENERAMOS CON LA FECHA ACTUAL
                        end: date_utils.add(date_utils.parse(this.task.start), 5, 'day'),
                        name: '',
                        id: indice + '',
                        Father: false,
                        Porcent: 100,
                        dependencies: [this.task.id]
                    }
                    indice = indice + 1;

                    //LA AGREGO JUSTO CUANDO EMPIEZA LA TAREA PADRE QUE REQUIERE
                    for (var i = 0; i < GanttGeneral.tasks.length; i++) {
                        if (GanttGeneral.tasks[i].id == this.task.id) {
                            if (i == GanttGeneral.tasks.length - 1) {
                                GanttGeneral.tasks.push(task); // SI ES LA ULTIMA TAREA LA AGREGAMOS AL FINAL
                                break;
                            } else {
                                GanttGeneral.tasks.splice(i + 1, 0, task); // LA AGREGAMOS JUSTO DESPUES PARA MANTENER LA ESTETICA DEL PROYECTO
                                break;
                            }
                        }
                    }
                    this.gantt.setup_tasks(this.gantt.tasks);

                    // initialize with default view mode
                    this.gantt.change_view_mode();
                    this.gantt.bind_events();

                }, false);


                /**************************************************************************/







                requestAnimationFrame(() => this.update_labelFather_position());

            }















        }

        draw_resize_handles() {
            if (this.invalid) return;
            if (this.task.name == '') return;

            const bar = this.$bar;
            const handle_width = 8;

            createSVG('rect', {
                x: bar.getX() + bar.getWidth() - 5,
                y: bar.getY() + 10,
                width: 5,
                height: this.height - 20,
                rx: 2,
                ry: 2,
                class: 'handle right',
                append_to: this.handle_group,
            });

            createSVG('rect', {
                x: bar.getX(),
                y: bar.getY() + 10,
                width: 5,
                height: this.height - 20,
                rx: 2,
                ry: 2,
                class: 'handle left',
                append_to: this.handle_group,
            });

            createSVG('image', {
                href: 'dist/Imag/Grupo359.png',
                class: 'delete',
                x: this.x - 14, // YA QUE NO PODEMOS OBTENERLA DESDE AQUI LA CUADRAMOS ABAJO EN EL RESETEO
                y: this.y + this.height / 10,
                width: 11,
                height: 11,
                append_to: this.handle_group
            });


            if (this.task.progress && this.task.progress < 100) {
                this.$handle_progress = createSVG('polygon', {
                    points: this.get_progress_polygon_points().join(','),
                    class: 'handle progress',
                    append_to: this.handle_group,
                });
            }
        }

        get_progress_polygon_points() {
            const bar_progress = this.$bar_progress;
            return [
                bar_progress.getEndX() - 5,
                bar_progress.getY() + bar_progress.getHeight(),
                bar_progress.getEndX() + 5,
                bar_progress.getY() + bar_progress.getHeight(),
                bar_progress.getEndX(),
                bar_progress.getY() + bar_progress.getHeight() - 8.66,
            ];
        }

        bind() {
            if (this.invalid) return;
            this.setup_click_event();
        }

        setup_click_event() {
            $.on(this.group, 'focus ' + this.gantt.options.popup_trigger, (e) => {
                if (this.action_completed) {
                    // just finished a move action, wait for a few seconds
                    return;
                }


                //this.show_popup();
                this.gantt.unselect_all();
                this.group.classList.add('active');
            });

            $.on(this.group, 'dblclick', (e) => {
                if (this.action_completed) {
                    // just finished a move action, wait for a few seconds
                    return;
                }

                this.gantt.trigger_event('click', [this.task]);
            });
        }

        show_popup() {
            if (this.gantt.bar_being_dragged) return;

            const start_date = date_utils.format(
                this.task._start,
                'MMM D',
                this.gantt.options.language
            );
            const end_date = date_utils.format(
                date_utils.add(this.task._end, -1, 'second'),
                'MMM D',
                this.gantt.options.language
            );
            const subtitle = start_date + ' - ' + end_date;

            this.gantt.show_popup({
                target_element: this.$bar,
                title: this.task.name,
                subtitle: subtitle,
                task: this.task,
            });
        }

        update_bar_position({ x = null, width = null }) {
            if (this.task.name == '') {
                // INHABILITAMOS EL MOVIMIENTO PARA LOS CASOS DONDE NO SE LLENE LOS CAMPOS DE LA TAREA PRIMERO.
                return;
            }
            const bar = this.$bar;
            if (x) {
                // get all x values of parent task
                const xs = this.task.dependencies.map((dep) => {
                    return this.gantt.get_bar(dep).$bar.getX();
                });
                // child task must not go before parent
                const valid_x = xs.reduce((prev, curr) => {
                    return x >= curr;
                }, x);
                if (!valid_x) {
                    width = null;
                    return;
                }
                this.update_attr(bar, 'x', x);
            }
            if (width && width >= this.gantt.options.column_width) {
                this.update_attr(bar, 'width', width);
            }
            if (this.task.name == '') {
                this.update_label_position_null();

            } else {
                this.update_label_position();
            }
            this.update_arrow_position();
            if (this.task.name != '') {
                this.update_handle_position();

            }

            this.update_circle_position();
            if (this.task.Father) {
                if (this.task.name == '') {
                    this.update_labelFather_position_null();
                } else {
                    this.update_labelFather_position(); // ACTUALIZAMOS LOS ELEMENTOS DEL PADRE

                }

            } else {
                if (this.task.name == '') {
                    this.update_labelFather_position_null();
                }
            }


        }

        date_changed() {
            let changed = false;
            const { new_start_date, new_end_date } = this.compute_start_end_date();

            if (Number(this.task._start) !== Number(new_start_date)) {
                changed = true;
                this.task._start = new_start_date;
            }

            if (Number(this.task._end) !== Number(new_end_date)) {
                changed = true;
                this.task._end = new_end_date;
            }

            if (!changed) {
                var IdTarea = this.task.id;
                for (var i = 0; i < this.gantt.tasks.length; i++) {
                    if (this.gantt.tasks[i].id == IdTarea) {
                        this.gantt.tasks[i].end = new_end_date;
                        this.gantt.tasks[i].start = new_start_date;

                    }

                }

                return;

            } else {
                var IdTarea = this.task.id;
                for (var i = 0; i < this.gantt.tasks.length; i++) {
                    if (this.gantt.tasks[i].id == IdTarea) {
                        this.gantt.tasks[i].end = new_end_date;
                        this.gantt.tasks[i].start = new_start_date;

                    }

                }

                this.gantt.trigger_event('date_change', [
                    this.task,
                    new_start_date,
                    date_utils.add(new_end_date, 0, 'second'), // UN CAMBIO
                ]);
            }



            var label_2 = this.group.querySelector(this.ClassDate);
            label_2.innerHTML = date_utils.format(
                this.task._start,
                'DD-MMM'
            ) + ' / ' + date_utils.format(
                this.task._end,
                'DD-MMM'
            )

        }

        progress_changed() {
            const new_progress = this.compute_progress();
            this.task.progress = new_progress;
            this.gantt.trigger_event('progress_change', [this.task, new_progress]);
        }

        set_action_completed() {
            this.action_completed = true;
            setTimeout(() => (this.action_completed = false), 1000);
        }

        compute_start_end_date() {
            const bar = this.$bar;
            const x_in_units = bar.getX() / this.gantt.options.column_width;
            const new_start_date = date_utils.add(
                this.gantt.gantt_start,
                x_in_units * this.gantt.options.step,
                'hour'
            );
            const width_in_units = bar.getWidth() / this.gantt.options.column_width;
            if (!Change) {
                Change = true;
                var new_end_date = date_utils.add(
                    new_start_date,
                    width_in_units * this.gantt.options.step - 1,
                    'hour'
                );
            } else {
                var new_end_date = date_utils.add(
                    new_start_date,
                    width_in_units * this.gantt.options.step - 1,
                    'hour'
                );

            }


            return { new_start_date, new_end_date };
        }

        compute_progress() {
            const progress =
                (this.$bar_progress.getWidth() / this.$bar.getWidth()) * 100;
            return parseInt(progress, 10);
        }

        compute_x() {
            const { step, column_width } = this.gantt.options;
            const task_start = this.task._start;
            const gantt_start = this.gantt.gantt_start;

            const diff = date_utils.diff(task_start, gantt_start, 'hour');
            let x = (diff / step) * column_width;

            if (this.gantt.view_is('Month')) {
                const diff = date_utils.diff(task_start, gantt_start, 'day');
                x = (diff * column_width) / 30;
            }
            return x;
        }

        compute_y() {
            return (
                this.gantt.options.header_height +
                this.gantt.options.padding +
                this.task._index * (this.height + this.gantt.options.padding)
            );
        }

        get_snap_position(dx) {
            let odx = dx,
                rem,
                position;

            if (this.gantt.view_is('Week')) {
                rem = dx % (this.gantt.options.column_width / 7);
                position =
                    odx -
                    rem +
                    (rem < this.gantt.options.column_width / 14 ?
                        0 :
                        this.gantt.options.column_width / 7);
            } else if (this.gantt.view_is('Month')) {
                rem = dx % (this.gantt.options.column_width / 30);
                position =
                    odx -
                    rem +
                    (rem < this.gantt.options.column_width / 60 ?
                        0 :
                        this.gantt.options.column_width / 30);
            } else {
                rem = dx % this.gantt.options.column_width;
                position =
                    odx -
                    rem +
                    (rem < this.gantt.options.column_width / 2 ?
                        0 :
                        this.gantt.options.column_width);
            }
            return position;
        }

        update_attr(element, attr, value) {
            value = +value;
            if (!isNaN(value)) {
                element.setAttribute(attr, value);
            }
            return element;
        }

        update_progressbar_position() {
            this.$bar_progress.setAttribute('x', this.$bar.getX());
            this.$bar_progress.setAttribute(
                'width',
                (this.$bar.getWidth() + 27) * (this.task.progress / 100)
            );
        }
        update_labelFather_position_null() {
            const bar = this.$bar; // DEFINIMOS EL ELEMENTO DE LA CAJA
            var InputLabel = this.group.querySelector('.InputLabel'); // OBTENEMOS LA RELACIÓN DE LA IMAGEN.

            var CajaF = bar.getX() + bar.getWidth();
            var PositionInputFinal = (parseFloat(InputLabel.getAttribute('x')) + InputLabel.getBBox().width); // DISTANCIA FINAL DEL NOMBRE DE LA TAREA.


            /* SETEAMOS LA POSICIÓN DEL LABEL INPUT */
            InputLabel.setAttribute('x', bar.getX() + 10); // SETEAMOS LA POSICIÓN DEL INPUT
            /* SETEAMOS LA POSICIÓN  SIEMPRE ADELANTE DEL TEXTO */

            if ((CajaF - PositionInputFinal) < 1) {

                InputLabel.classList.add('big');

            } else {
                InputLabel.classList.remove('big');
            }

            /******************************************************* */
            //CALCULAMOS DISTANCIAS ENTRE EL PORCENT


        }

        update_labelFather_position() {

            const bar = this.$bar; // DEFINIMOS EL ELEMENTO DE LA CAJA
            var Name = this.group.querySelector('.bar-label.name');
            var Date = this.group.querySelector('.bar-label.date');
            var TaskButton = this.group.querySelector('.bar-label.TaskButton'); // ASOCIAMOS LA CAJA DONDE ESTA EL BOTON DE TAREAS.
            var infoImage = this.group.querySelector('.bar-label.InfoImage') // OBTENEMOS LA RELACIÓN DE LA IMAGEN.
            var CajaF = bar.getX() + bar.getWidth();
            var TaskButtonX = parseFloat(TaskButton.getAttribute('x')); // UBICAMOS LA POSICIÓN INICIAL EN X DEL BOTON
            var PositionDateFinal = (parseFloat(Date.getAttribute('x')) + Date.getBBox().width);
            var PositionNameFinal = (parseFloat(Name.getAttribute('x')) + Name.getBBox().width); // DISTANCIA FINAL DEL NOMBRE DE LA TAREA.
            /* SETEAMOS LA POSICIÓN  SIEMPRE ADELANTE DEL TEXTO */


            infoImage.setAttribute('x', PositionNameFinal + 3);
            TaskButton.setAttribute('x', CajaF - 70);


            if ((CajaF - PositionNameFinal) < 5) {

                infoImage.classList.add('big');

            } else {
                infoImage.classList.remove('big');
            }





            /******************************************************* */

            var PositionDateFinal = (parseFloat(Date.getAttribute('x')) + Date.getBBox().width); // OBTENEMOS LA DISTANCIA FINAL DE LA FECHA. 
            //CALCULAMOS DISTANCIAS ENTRE EL PORCENTAJE Y LOS TEXTOS INICIALES


            /* OBTENEMOS LA DISTANCIA ENTRE EL BOTON DE TASK Y EL TEXTO DE TAREAS */

            if ((TaskButtonX - PositionNameFinal) < 5 || (TaskButtonX - PositionDateFinal) < 5) {
                TaskButton.classList.add('big');
            } else {
                TaskButton.classList.remove('big');
            }











        }
        update_label_position_null() {

            const bar = this.$bar, // OBTENEMOS EL CONTENEDOR
                label_2 = this.group.querySelector(this.ClassDate), // OBTENEMOS EL OBJETO HTML DEL TEXTO DE FECHA
                label_3 = this.group.querySelector('.bar-label.dateImage'),
                label_4 = this.group.querySelector(this.ClassBig)
            if (label_2.getBBox().width >= bar.getWidth() - 40) {

                /* RESPONSIVE PARA EL TITULO DEL PROYECTO */
                label_2.classList.add('big');
                //label_2.setAttribute('x', bar.getX() + bar.getWidth() + 15);

                //label.setAttribute('x', bar.getX() + bar.getWidth() + 15);

                /* RESPONSIVE PARA LA IMAGEN DE LA FECHA */
                label_3.classList.remove('big');
                label_3.setAttribute('y', bar.getY() + bar.getHeight() / 2.5);
                label_3.setAttribute('x', bar.getX() + (this.const_name_x));

                // /* RESPONSIVE PARA EL TEXTO ... */
                label_4.classList.add('big');
                label_4.setAttribute('x', bar.getX() + (this.const_date_x));

            } else {

                label_2.classList.remove('big');
                label_2.setAttribute('x', bar.getX() + (this.const_date_x));
                /* RESPONSIVE PARA LA FECHA DEL PROYECTO */
                /* RESPONSIVE PARA LA IMAGEN DE LA FECHA */
                //label_3.classList.remove('big');
                label_3.classList.remove('big');
                label_3.setAttribute('x', bar.getX() + this.const_name_x);
                label_3.setAttribute('y', bar.getY() + bar.getHeight() / 1.75);

                /* MODIFICANDO TEXTO PUNTOS */
                label_4.classList.remove('big');
            }






        }

        update_label_position() {

            const bar = this.$bar, // OBTENEMOS EL CONTENEDOR
                label = this.group.querySelector(this.ClassName), //OBTENEMOS EL ANCHO ACTUAL DE LA CAJA
                label_2 = this.group.querySelector(this.ClassDate), // OBTENEMOS EL OBJETO HTML DEL TEXTO DE FECHA
                label_3 = this.group.querySelector('.bar-label.dateImage'),
                label_4 = this.group.querySelector(this.ClassBig)
            if (label.getBBox().width >= bar.getWidth() - 40) {

                /* RESPONSIVE PARA EL TITULO DEL PROYECTO Y EL BOTON DE INFO */
                label.classList.add('big');
                label.setAttribute('x', bar.getX() + bar.getWidth() + 15);


                /* RESPONSIVE PARA LA FECHA DEL PROYECTO */
                label_2.classList.add('big');
                label_2.setAttribute('x', bar.getX() + bar.getWidth() + 15);

                /* RESPONSIVE PARA LA IMAGEN DE LA FECHA */
                //label_3.classList.add('big');
                label_3.setAttribute('y', bar.getY() + bar.getHeight() / 2.5);
                label_3.setAttribute('x', bar.getX() + (this.const_name_x));

                // /* RESPONSIVE PARA EL TEXTO ... */
                label_4.classList.add('big');
                label_4.setAttribute('x', bar.getX() + (this.const_date_x));



                /* DEFINIMOS LA MAQUINA DE ESTADOS DEL TAMAÑO MAS PEQUEÑO MAS PEQUEÑA */

                //CALCULAMOS HASTA DONDE LLEGAN LOS PUNTOS
                var PF_Points = label_4.getBBox().width + parseInt(label_4.getAttribute('x'));
                var PF_Caja = bar.getX() + bar.getWidth() - 20;

                if (PF_Points > PF_Caja) {

                    label_3.classList.add('big'); // DESAPARECEMOS EL ICONO
                    label_4.setAttribute('x', bar.getX() + bar.getWidth() / 3.5);

                    if (this.gantt.options.view_mode == 'Year' || this.gantt.options.view_mode == 'Month' || this.gantt.options.view_mode == 'Week') {
                        var PF_Points = label_4.getBBox().width + parseInt(label_4.getAttribute('x'));
                        var PF_Caja = bar.getX() + bar.getWidth() - 20;
                        if (PF_Points > PF_Caja) {
                            label_4.classList.remove('big');
                        }
                    }


                } else {
                    label_3.classList.remove('big');


                }





            } else if (label_2.getBBox().width >= bar.getWidth() - 40) {

                /* RESPONSIVE PARA EL TITULO DEL PROYECTO */
                label_2.classList.add('big');
                //label_2.setAttribute('x', bar.getX() + bar.getWidth() + 15);

                /* RESPONSIVE PARA LA FECHA DEL PROYECTO */
                label.classList.add('big');
                //label.setAttribute('x', bar.getX() + bar.getWidth() + 15);

                /* RESPONSIVE PARA LA IMAGEN DE LA FECHA */
                label_3.classList.remove('big');
                label_3.setAttribute('y', bar.getY() + bar.getHeight() / 2.5);
                label_3.setAttribute('x', bar.getX() + (this.const_name_x));

                // /* RESPONSIVE PARA EL TEXTO ... */
                label_4.classList.add('big');
                label_4.setAttribute('x', bar.getX() + (this.const_date_x));

            } else {

                label_2.classList.remove('big');
                label_2.setAttribute('x', bar.getX() + (this.const_date_x));
                /* RESPONSIVE PARA LA FECHA DEL PROYECTO */
                label.setAttribute('x', bar.getX() + (this.const_name_x));
                label.classList.remove('big');
                /* RESPONSIVE PARA LA IMAGEN DE LA FECHA */
                //label_3.classList.remove('big');
                label_3.classList.remove('big');
                label_3.setAttribute('x', bar.getX() + this.const_name_x);
                label_3.setAttribute('y', bar.getY() + bar.getHeight() / 1.75);

                /* MODIFICANDO TEXTO PUNTOS */
                label_4.classList.remove('big');
            }


        }


        update_handle_position() {
            const bar = this.$bar;
            this.handle_group
                .querySelector('.handle.left')
                .setAttribute('x', bar.getX());
            this.handle_group
                .querySelector('.handle.right')
                .setAttribute('x', (parseFloat(bar.getAttribute('x')) + bar.getWidth()) - 5);
            const handle = this.group.querySelector('.handle.progress');
            handle &&
                handle.setAttribute('points', this.get_progress_polygon_points());
            this.handle_group.querySelector('.delete').setAttribute('x', bar.getX() - 14);
        }

        update_arrow_position() {
            this.arrows = this.arrows || [];
            for (let arrow of this.arrows) {
                arrow.update();
            }
        }
        update_circle_position() {


            const bar = this.$bar;
            this.bar_group.querySelector(this.CircleInputTag).setAttribute('cx', bar.getX());
            this.bar_group.querySelector(this.CircleOutputTag).setAttribute('cx', bar.getX() + bar.getWidth() + 10);
            this.bar_group.querySelector(this.LineTag).setAttribute('x1', bar.getX() + bar.getWidth());
            this.bar_group.querySelector(this.LineTag).setAttribute('x2', bar.getX() + bar.getWidth() + 5);

        }

    }

    class Arrow {
        constructor(gantt, from_task, to_task) {
            this.gantt = gantt; // TENEMOS EL GANK
            this.from_task = from_task; // TENEMOS LA TAREA PRINCIPAL
            this.to_task = to_task;
            this.generateConector();
            this.calculate_path();
            this.draw();
        }
        generateConector() {


            var CircleOutput = this.from_task.bar_group.childNodes[2];
            var CircleInput = this.to_task.bar_group.childNodes[0];
            var Line = this.from_task.bar_group.childNodes[1];
            CircleOutput.style.opacity = 1;
            Line.style.opacity = 1;
            CircleInput.style.opacity = 1;

        }

        calculate_path() {
            let start_x =
                this.from_task.$bar.getX() + this.from_task.$bar.getWidth() + 10;

            const start_y =
                this.gantt.options.header_height +
                this.gantt.options.bar_height +
                (this.gantt.options.padding + this.gantt.options.bar_height) *
                this.from_task.task._index +
                this.gantt.options.padding - 20;

            const end_x = this.to_task.$bar.getX();
            const end_y =
                this.gantt.options.header_height +
                this.gantt.options.bar_height / 2 +
                (this.gantt.options.padding + this.gantt.options.bar_height) *
                this.to_task.task._index +
                this.gantt.options.padding;

            const from_is_below_to =
                this.from_task.task._index > this.to_task.task._index;
            const curve = this.gantt.options.arrow_curve;
            const clockwise = from_is_below_to ? 1 : 0;
            const curve_y = from_is_below_to ? -curve : curve;
            const offset = from_is_below_to ?
                end_y + this.gantt.options.arrow_curve :
                end_y - this.gantt.options.arrow_curve;


            const down_1 = this.gantt.options.padding / 2 - curve;
            const down_2 =
                this.to_task.$bar.getY() +
                this.to_task.$bar.getHeight() / 2 -
                curve_y;
            const left = this.to_task.$bar.getX() - this.gantt.options.padding;
            if (start_y > end_y) {
                var down1 = -down_1 - 20
                this.crossPositiony = start_y + down1 - 5.5;
            } else {
                this.crossPositiony = start_y + down_1 + 20 - 5.5;
                var down1 = down_1 + 20
            }
            this.path = `
                M ${start_x} ${start_y}
                v ${down1}
                a ${curve} ${curve} 0 0 1 -${curve} ${curve}
                H ${left}
                a ${curve} ${curve} 0 0 ${clockwise} -${curve} ${curve_y}
                V ${down_2}
                a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
                L ${end_x} ${end_y}
                `;



            var down2 = down_2 - (start_y + down_1);

            if (end_y > start_y && end_x > start_x) {
                this.crossPositionX = ((end_x - start_x) / 2) + start_x - 11;
            } else if (end_y > start_y && start_x > end_x) {
                this.crossPositionX = ((start_x - end_x) / 2) + end_x - 11;
            } else if (end_y < start_y && start_x < end_x) {
                this.crossPositionX = ((end_x - start_x) / 2) + start_x - 11;

            } else {
                this.crossPositionX = ((start_x - end_x) / 2) + end_x - 11;
            }




        }

        draw() {
            this.element = createSVG('path', {
                d: this.path,
                width: 20,
                'data-from': this.from_task.task.id,
                'data-to': this.to_task.task.id,
            });

            this.element.addEventListener('mouseover', (event) => {
                    this.element.style.stroke = '#DE9BE8';
                    this.to_task.handle_group.childNodes[2].style.visibility = 'visible';
                    this.to_task.handle_group.childNodes[2].setAttribute('x', this.crossPositionX);
                    this.to_task.handle_group.childNodes[2].setAttribute('y', this.crossPositiony);

                }, false)
                ///HOLA MUNDO
            this.element.addEventListener('click', (event) => {
                // GENERO UN CICLO PARA ENCONTRAR LA DEPENDENCIA DE LAS HIJAS..
                console.log('click arrow');
                var bandera = false;
                //ELIMINAMOS LA ASOCIACIÓN EN EL DEPENDECIES MAP
                var Indice = GanttGeneral.dependency_map[this.from_task.task.id].findIndex(task => task === this.to_task.task.id);
                GanttGeneral.dependency_map[this.from_task.task.id].splice(Indice, 1);
                for (var i = 0; i < GanttGeneral.tasks.length; i++) {
                    if (GanttGeneral.tasks[i].id == this.to_task.task.id) {


                        // ENCONTRAMOS LA TAREA ASOCIADA
                        var arreglo = [];
                        new Set(GanttGeneral.tasks[i].dependencies).forEach(k => arreglo.push(k)) // ELIMINAMOS LOS REPETIDOS...aa.forEach(k => ar.push(k))
                        GanttGeneral.tasks[i].dependencies = arreglo;
                        // CREAMOS OTRO CICLO PARA ENCONTRAR LA POSICIÓN EN EL ARREGLO DE LA DEPENDENCIA:
                        for (var d = 0; d < GanttGeneral.tasks[i].dependencies.length; d++) {
                            if (GanttGeneral.tasks[i].dependencies[d] == this.from_task.task.id) {
                                GanttGeneral.tasks[i].dependencies.splice(d, 1); // ELIMINAMOS LA ASIGNACIÓN
                                bandera = true;
                                break;
                            }
                        }
                        if (bandera) {
                            break; // TERMINAMOS EL CICLO
                        }
                    }
                }
                //GanttGeneral.make_arrow_update();
                GanttGeneral.setup_tasks(GanttGeneral.tasks);
                //GanttGeneral.render();
                // initializ with default view mode
                GanttGeneral.change_view_mode();
                GanttGeneral.bind_events();

            });


            this.element.addEventListener('mouseleave', (event) => {
                this.element.style.stroke = '#6149CD';
                this.to_task.handle_group.childNodes[2].style.visibility = 'hidden';

            }, false)
        }


        update() {
            this.calculate_path();
            this.generateConector();
            this.element.setAttribute('d', this.path);

        }
    }

    class Popup {
        constructor(parent, custom_html) {
            this.parent = parent;
            this.custom_html = custom_html;
            this.make();
        }

        make() {
            this.parent.innerHTML = `
            <div class="title"></div>
            <div class="subtitle"></div>
            <div class="pointer"></div>
        `;

            this.hide();

            this.title = this.parent.querySelector('.title');
            this.subtitle = this.parent.querySelector('.subtitle');
            this.pointer = this.parent.querySelector('.pointer');
        }

        show(options) {
            if (!options.target_element) {
                throw new Error('target_element is required to show popup');
            }
            if (!options.position) {
                options.position = 'left';
            }
            const target_element = options.target_element;

            if (this.custom_html) {
                let html = this.custom_html(options.task);
                html += '<div class="pointer"></div>';
                this.parent.innerHTML = html;
                this.pointer = this.parent.querySelector('.pointer');
            } else {
                // set data
                this.title.innerHTML = options.title;
                this.subtitle.innerHTML = options.subtitle;
                this.parent.style.width = this.parent.clientWidth + 'px';
            }

            // set position
            let position_meta;
            if (target_element instanceof HTMLElement) {
                position_meta = target_element.getBoundingClientRect();
            } else if (target_element instanceof SVGElement) {
                position_meta = options.target_element.getBBox();
            }

            if (options.position === 'left') {
                this.parent.style.left =
                    position_meta.x + (position_meta.width + 40) + 'px';
                this.parent.style.top = position_meta.y + 'px';

                this.pointer.style.transform = 'rotateZ(90deg)';
                this.pointer.style.left = '-7px';
                this.pointer.style.top = '2px';
            }

            // show
            this.parent.style.opacity = 1;
        }

        hide() {
            this.parent.style.opacity = 0;
            this.parent.style.left = 0;
        }
    }

    const VIEW_MODE = {
        QUARTER_DAY: 'Quarter Day',
        HALF_DAY: 'Half Day',
        DAY: 'Day',
        WEEK: 'Week',
        MONTH: 'Month',
        YEAR: 'Year',
    };

    class Gantt {
        constructor(wrapper, tasks, options) {
            options = options;
            this.setup_wrapper(wrapper);
            this.setup_options(options);
            this.ResetTasks(tasks);
            this.setup_tasks(tasks);
            // initialize with default view mode
            this.change_view_mode();
            this.bind_events();
        }

        ReturnTasks() {
            return this.tasks;
        }
        ResetTasks(tasks) {
            for (var i = 0; i < tasks.length; i++) {
                if (tasks[i].start == '' || tasks[i].end == '') {
                    const today = date_utils.today();
                    tasks[i].start = today;
                    tasks[i].end = date_utils.add(today, 6, 'day');


                }
            }
        }





        setup_wrapper(element) {
            let svg_element, wrapper_element;

            // CSS Selector is passed
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }

            // get the SVGElement
            if (element instanceof HTMLElement) {
                wrapper_element = element;
                svg_element = element.querySelector('svg');
            } else if (element instanceof SVGElement) {
                svg_element = element;
            } else {
                throw new TypeError(
                    'Frappé Gantt only supports usage of a string CSS selector,' +
                    " HTML DOM element or SVG DOM element for the 'element' parameter"
                );
            }

            // svg element
            if (!svg_element) {
                // create it
                this.$svg = createSVG('svg', {
                    append_to: wrapper_element,
                    class: 'gantt',
                });
            } else {
                this.$svg = svg_element;
                this.$svg.classList.add('gantt');
            }

            // wrapper element
            this.$container = document.createElement('div');
            this.$container.classList.add('gantt-container');

            const parent_element = this.$svg.parentElement;
            parent_element.appendChild(this.$container);
            this.$container.appendChild(this.$svg);

            // popup wrapper
            this.popup_wrapper = document.createElement('div');
            this.popup_wrapper.classList.add('popup-wrapper');
            this.$container.appendChild(this.popup_wrapper);
        }

        setup_options(options) {
            const default_options = {
                header_height: 40,
                column_width: 10,
                step: 24,
                view_modes: [...Object.values(VIEW_MODE)],
                bar_height: 40,
                bar_corner_radius: 12,
                arrow_curve: 0,
                padding: 20,
                view_mode: 'Day',
                date_format: 'YYYY-MM-DD',
                popup_trigger: 'click',
                custom_popup_html: null,
                language: 'en',
            };
            this.options = Object.assign({}, default_options, options);
        }

        setup_tasks(tasks) {
            // prepare tasks
            this.tasks = tasks.map((task, i) => {
                // convert to Date objects
                task._start = date_utils.parse(task.start);
                task._end = date_utils.parse(task.end);

                // make task invalid if duration too large
                if (date_utils.diff(task._end, task._start, 'year') > 10) {
                    task.end = null;
                }

                // cache index
                task._index = i;

                // invalid dates
                if (!task.start && !task.end) {
                    const today = date_utils.today();
                    task._start = today;
                    task._end = date_utils.add(today, 2, 'day');
                }

                if (!task.start && task.end) {
                    task._start = date_utils.add(task._end, -2, 'day');
                }

                if (task.start && !task.end) {
                    task._end = date_utils.add(task._start, 2, 'day');
                }

                // if hours is not set, assume the last day is full day
                // e.g: 2018-09-09 becomes 2018-09-09 23:59:59
                const task_end_values = date_utils.get_date_values(task._end);
                if (task_end_values.slice(3).every((d) => d === 0)) {
                    task._end = date_utils.add(task._end, 24, 'hour');
                }

                // invalid flag
                if (!task.start || !task.end) {
                    task.invalid = true;
                }

                // dependencies
                if (typeof task.dependencies === 'string' || !task.dependencies) {
                    let deps = [];
                    if (task.dependencies) {
                        deps = task.dependencies
                            .split(',')
                            .map((d) => d.trim())
                            .filter((d) => d);
                    }
                    task.dependencies = deps;
                }

                // uids
                if (!task.id) {
                    task.id = generate_id(task);
                }

                return task;
            });

            this.setup_dependencies();
        }

        setup_dependencies() {
            this.dependency_map = {};
            for (let t of this.tasks) {
                for (let d of t.dependencies) {
                    this.dependency_map[d] = this.dependency_map[d] || [];
                    this.dependency_map[d].push(t.id);
                }
            }
        }

        refresh(tasks) {
            this.setup_tasks(tasks);
            this.change_view_mode();
        }

        change_view_mode(mode = this.options.view_mode) {
            this.update_view_scale(mode);
            this.setup_dates();
            this.render();
            // fire viewmode_change event
            this.trigger_event('view_change', [mode]);
        }

        update_view_scale(view_mode) {
            this.options.view_mode = view_mode;

            if (view_mode === VIEW_MODE.DAY) {
                this.options.step = 24;
                this.options.column_width = 38;
            } else if (view_mode === VIEW_MODE.HALF_DAY) {
                this.options.step = 24 / 2;
                this.options.column_width = 38;
            } else if (view_mode === VIEW_MODE.QUARTER_DAY) {
                this.options.step = 24 / 4;
                this.options.column_width = 38;
            } else if (view_mode === VIEW_MODE.WEEK) {
                this.options.step = 24 * 7;
                this.options.column_width = 140;
            } else if (view_mode === VIEW_MODE.MONTH) {
                this.options.step = 24 * 30;
                this.options.column_width = 120;
            } else if (view_mode === VIEW_MODE.YEAR) {
                this.options.step = 24 * 365;
                this.options.column_width = 120;
            }
        }

        setup_dates() {
            this.setup_gantt_dates();
            this.setup_date_values();
        }

        setup_gantt_dates() {
            this.gantt_start = this.gantt_end = null;

            for (let task of this.tasks) {
                // set global start and end date
                if (!this.gantt_start || task._start < this.gantt_start) {
                    this.gantt_start = task._start;
                }
                if (!this.gantt_end || task._end > this.gantt_end) {
                    this.gantt_end = task._end;
                }
            }

            this.gantt_start = date_utils.start_of(this.gantt_start, 'day');
            this.gantt_end = date_utils.start_of(this.gantt_end, 'day');

            // add date padding on both sides
            if (this.view_is([VIEW_MODE.QUARTER_DAY, VIEW_MODE.HALF_DAY])) {
                this.gantt_start = date_utils.add(this.gantt_start, -7, 'day');
                this.gantt_end = date_utils.add(this.gantt_end, 7, 'day');
            } else if (this.view_is(VIEW_MODE.MONTH)) {
                this.gantt_start = date_utils.start_of(this.gantt_start, 'year');
                this.gantt_end = date_utils.add(this.gantt_end, 1, 'year');
            } else if (this.view_is(VIEW_MODE.YEAR)) {
                this.gantt_start = date_utils.add(this.gantt_start, -2, 'year');
                this.gantt_end = date_utils.add(this.gantt_end, 2, 'year');
            } else {
                this.gantt_start = date_utils.add(this.gantt_start, -1, 'month');
                this.gantt_end = date_utils.add(this.gantt_end, 1, 'month');
            }
        }

        setup_date_values() {
            this.dates = [];
            let cur_date = null;

            while (cur_date === null || cur_date < this.gantt_end) {
                if (!cur_date) {
                    cur_date = date_utils.clone(this.gantt_start);
                } else {
                    if (this.view_is(VIEW_MODE.YEAR)) {
                        cur_date = date_utils.add(cur_date, 1, 'year');
                    } else if (this.view_is(VIEW_MODE.MONTH)) {
                        cur_date = date_utils.add(cur_date, 1, 'month');
                    } else {
                        cur_date = date_utils.add(
                            cur_date,
                            this.options.step,
                            'hour'
                        );
                    }
                }
                this.dates.push(cur_date);
            }
        }

        bind_events() {
            this.bind_grid_click();
            this.bind_bar_events();
        }

        render() {
            GanttGeneral = this;
            GanttGeneral.clear();
            GanttGeneral.setup_layers();
            GanttGeneral.make_grid();
            GanttGeneral.make_dates();
            GanttGeneral.make_bars();
            GanttGeneral.make_arrows();
            GanttGeneral.map_arrows_on_bars();
            GanttGeneral.set_width();
            GanttGeneral.set_scroll_position();
        }

        setup_layers() {
            this.layers = {};
            const layers = ['grid', 'date', 'arrow', 'progress', 'bar', 'details'];
            // make group layers
            for (let layer of layers) {
                this.layers[layer] = createSVG('g', {
                    class: layer,
                    append_to: this.$svg,
                });
            }
        }

        make_grid() {
            this.make_grid_background();
            this.make_grid_rows();
            this.make_grid_header();
            this.make_grid_ticks();
            this.make_grid_highlights();
        }

        make_grid_background() {
            const grid_width = this.dates.length * this.options.column_width;
            const grid_height =
                this.options.header_height +
                this.options.padding +
                (this.options.bar_height + this.options.padding) *
                this.tasks.length;


            createSVG('rect', {
                x: 0,
                y: 0,
                width: grid_width,
                height: grid_height,
                class: 'grid-background',
                append_to: this.layers.grid,
            });

            $.attr(this.$svg, {
                height: grid_height + this.options.padding + 100,
                width: '100%',
            });
        }

        make_grid_rows() {
            const rows_layer = createSVG('g', { append_to: this.layers.grid });
            const lines_layer = createSVG('g', { append_to: this.layers.grid });

            const row_width = this.dates.length * this.options.column_width;
            const row_height = this.options.bar_height + this.options.padding;

            let row_y = this.options.header_height + this.options.padding / 2;

            for (let task of this.tasks) {
                createSVG('rect', {
                    x: 0,
                    y: row_y,
                    width: row_width,
                    height: row_height,
                    class: 'grid-row',
                    append_to: rows_layer,
                });

                createSVG('line', {
                    x1: 0,
                    y1: row_y + row_height,
                    x2: row_width,
                    y2: row_y + row_height,
                    class: 'row-line',
                    append_to: lines_layer,
                });


                row_y += this.options.bar_height + this.options.padding;
            }
        }

        make_grid_header() {
            const header_width = this.dates.length * this.options.column_width;
            const header_height = this.options.header_height + 10;
            createSVG('rect', {
                x: 0,
                y: 0,
                width: header_width,
                height: header_height,
                class: 'grid-header',
                append_to: this.layers.grid,
            });
        }

        make_grid_ticks() {
            let tick_x = 0;
            let tick_y = this.options.header_height + this.options.padding / 2;
            let tick_height =
                (this.options.bar_height + this.options.padding) *
                this.tasks.length;

            for (let date of this.dates) {
                let tick_class = 'tick';
                // thick tick for monday
                if (this.view_is(VIEW_MODE.DAY) && date.getDate() === 1) {
                    tick_class += ' thick';
                }
                // thick tick for first week
                if (
                    this.view_is(VIEW_MODE.WEEK) &&
                    date.getDate() >= 1 &&
                    date.getDate() < 8
                ) {
                    tick_class += ' thick';
                }
                // thick ticks for quarters
                if (
                    this.view_is(VIEW_MODE.MONTH) &&
                    (date.getMonth() + 1) % 3 === 0
                ) {
                    tick_class += ' thick';
                }

                createSVG('path', {
                    d: `M ${tick_x} ${tick_y} v ${tick_height}`,
                    class: tick_class,
                    append_to: this.layers.grid,
                });

                if (this.view_is(VIEW_MODE.MONTH)) {
                    tick_x +=
                        (date_utils.get_days_in_month(date) *
                            this.options.column_width) /
                        30;
                } else {
                    tick_x += this.options.column_width;
                }
            }
        }

        make_grid_highlights() {
            // highlight today's date
            if (this.view_is(VIEW_MODE.DAY)) {
                const x =
                    (date_utils.diff(date_utils.today(), this.gantt_start, 'hour') /
                        this.options.step) *
                    this.options.column_width;
                const y = 0;

                const width = this.options.column_width;
                const height =
                    (this.options.bar_height + this.options.padding) *
                    this.tasks.length +
                    this.options.header_height +
                    this.options.padding / 2;

                if (this.options.view_mode === 'Day') {
                    createSVG('rect', {
                        x: x,
                        y: y,
                        width: width,
                        rx: this.options.bar_corner_radius,
                        ry: this.options.bar_corner_radius,

                        height: 50,
                        class: 'today-header',
                        append_to: this.layers.grid,
                    });
                    createSVG('circle', {
                        cx: x + width / 2,
                        cy: (y + (this.options.header_height / 2)),
                        r: width / 15,
                        class: 'today-header-circle',
                        append_to: this.layers.grid,
                    });




                }
                createSVG('rect', {
                    x: x + width / 4,
                    y: y,
                    width: width / 2,
                    height: height,
                    class: 'today-highlight',
                    append_to: this.layers.grid,
                });
            }
        }

        make_dates() {
            for (let date of this.get_dates_to_draw()) {

                if (date.today) {
                    createSVG('text', {
                        x: date.lower_x,
                        y: date.lower_y,
                        innerHTML: date.lower_text,
                        class: 'lower-text-today',
                        append_to: this.layers.date,
                    });
                } else {
                    createSVG('text', {
                        x: date.lower_x,
                        y: date.lower_y,
                        innerHTML: date.lower_text,
                        class: 'lower-text',
                        append_to: this.layers.date,
                    });

                }


                if (date.upper_text) {
                    const $upper_text = createSVG('text', {
                        x: date.upper_x,
                        y: date.upper_y,
                        innerHTML: date.upper_text,
                        class: 'upper-text',
                        append_to: this.layers.date,
                    });

                    // remove out-of-bound dates
                    if (
                        $upper_text.getBBox().x2 > this.layers.grid.getBBox().width
                    ) {
                        $upper_text.remove();
                    }
                }
            }
        }

        get_dates_to_draw() {
            let last_date = null;
            const dates = this.dates.map((date, i) => {

                /* FILTRAMOS LA FECHA ACTUAL: */



                var ActualDateValues = date_utils.get_date_values(new Date());
                var DateValues = date_utils.get_date_values(date);
                date.today = null;

                /*******************************/
                var d = this.get_date_info(date, last_date, i);
                last_date = date;
                d.today = null;
                if (DateValues[0] === ActualDateValues[0] && DateValues[1] === ActualDateValues[1] && DateValues[2] === ActualDateValues[2]) {
                    d.today = true; // OBTENEMOS EL DIA ACTUAL
                }
                return d;
            });
            return dates;
        }

        get_date_info(date, last_date, i) {
            if (!last_date) {
                last_date = date_utils.add(date, 1, 'year');
            }
            const date_text = {
                'Quarter Day_lower': date_utils.format(
                    date,
                    'HH',
                    this.options.language
                ),
                'Half Day_lower': date_utils.format(
                    date,
                    'HH',
                    this.options.language
                ),
                Day_lower: date.getDate() !== last_date.getDate() ?
                    date_utils.format(date, 'D', this.options.language) : '',
                Week_lower: date.getMonth() !== last_date.getMonth() ?
                    date_utils.format(date, 'D MMM', this.options.language) : date_utils.format(date, 'D', this.options.language),
                Month_lower: date_utils.format(date, 'MMMM', this.options.language),
                Year_lower: date_utils.format(date, 'YYYY', this.options.language),
                'Quarter Day_upper': date.getDate() !== last_date.getDate() ?
                    date_utils.format(date, 'D MMM', this.options.language) : '',
                'Half Day_upper': date.getDate() !== last_date.getDate() ?
                    date.getMonth() !== last_date.getMonth() ?
                    date_utils.format(
                        date,
                        'D MMM',
                        this.options.language
                    ) :
                    date_utils.format(date, 'D', this.options.language) : '',
                Day_upper: date.getMonth() !== last_date.getMonth() ?
                    date_utils.format(date, 'MMMM', this.options.language) : '',
                Week_upper: date.getMonth() !== last_date.getMonth() ?
                    date_utils.format(date, 'MMMM', this.options.language) : '',
                Month_upper: date.getFullYear() !== last_date.getFullYear() ?
                    date_utils.format(date, 'YYYY', this.options.language) : '',
                Year_upper: date.getFullYear() !== last_date.getFullYear() ?
                    date_utils.format(date, 'YYYY', this.options.language) : '',
            };

            const base_pos = {
                x: i * this.options.column_width,
                lower_y: this.options.header_height,
                upper_y: this.options.header_height - 25,
            };

            const x_pos = {
                'Quarter Day_lower': (this.options.column_width * 4) / 2,
                'Quarter Day_upper': 0,
                'Half Day_lower': (this.options.column_width * 2) / 2,
                'Half Day_upper': 0,
                Day_lower: this.options.column_width / 2,
                Day_upper: (this.options.column_width * 30) / 2,
                Week_lower: 0,
                Week_upper: (this.options.column_width * 4) / 2,
                Month_lower: this.options.column_width / 2,
                Month_upper: (this.options.column_width * 12) / 2,
                Year_lower: this.options.column_width / 2,
                Year_upper: (this.options.column_width * 30) / 2,
            };

            return {
                upper_text: date_text[`${this.options.view_mode}_upper`],
                lower_text: date_text[`${this.options.view_mode}_lower`],
                upper_x: base_pos.x + x_pos[`${this.options.view_mode}_upper`],
                upper_y: base_pos.upper_y,
                lower_x: base_pos.x + x_pos[`${this.options.view_mode}_lower`],
                lower_y: base_pos.lower_y,
            };
        }

        make_bars() {
            this.bars = this.tasks.map((task) => {
                const bar = new Bar(this, task); //CREAMOS LA BARRA PARA LA TAREA
                this.layers.bar.appendChild(bar.group);
                return bar;
            });
            FirstTime = false;
        }
        make_arrow_update() {
            for (let task of GanttGeneral.tasks) {
                let arrows = []; // CREAMOS UN ARREGLO PARA LAS TAREAS
                arrows = task.dependencies // ID DE LAS TAREAS DE DONDE SALE LA FLECHA,SURGEN  DE LA TAREA HIJA
                    .map((task_id) => {
                        const dependency = GanttGeneral.get_task(task_id);
                        //OBTENEMOS LA TAREA CORRESPONDIENTE EN LA CUAL EMPIEZA LA UNION
                        if (!dependency) return;
                        if (dependency.Father && task.Father === false) return; //ELIMINAMOS AL CONEXIÓN ENTRE PADRE E HIJAS;

                        //CREAMOS LA FLECHA
                        const arrow = new Arrow(
                            GanttGeneral, // LE ENVIAMOS EL GANG
                            GanttGeneral.bars[dependency._index], // from_task
                            GanttGeneral.bars[task._index] //ID DE LA TAREA DE DONDE TERMINA LA FLECHA.
                        );
                        GanttGeneral.layers.arrow.appendChild(arrow.element);
                        return arrow;
                    })
                    .filter(Boolean); // filter falsy values
                GanttGeneral.arrows = GanttGeneral.arrows.concat(arrows);
            }
        }



        make_arrows() {

            GanttGeneral.arrows = [];
            for (let task of GanttGeneral.tasks) {
                let arrows = []; // CREAMOS UN ARREGLO PARA LAS TAREAS
                arrows = task.dependencies // ID DE LAS TAREAS DE DONDE SALE LA FLECHA,SURGEN  DE LA TAREA HIJA
                    .map((task_id) => {
                        const dependency = GanttGeneral.get_task(task_id);
                        //OBTENEMOS LA TAREA CORRESPONDIENTE EN LA CUAL EMPIEZA LA UNION
                        if (!dependency) return;
                        if (dependency.Father && task.Father === false) return; //ELIMINAMOS AL CONEXIÓN ENTRE PADRE E HIJAS;

                        //CREAMOS LA FLECHA
                        const arrow = new Arrow(
                            GanttGeneral, // LE ENVIAMOS EL GANG
                            GanttGeneral.bars[dependency._index], // from_task
                            GanttGeneral.bars[task._index] //ID DE LA TAREA DE DONDE TERMINA LA FLECHA.
                        );
                        GanttGeneral.layers.arrow.appendChild(arrow.element);
                        return arrow;
                    })
                    .filter(Boolean); // filter falsy values
                GanttGeneral.arrows = GanttGeneral.arrows.concat(arrows);
            }
        }

        map_arrows_on_bars() {
            for (let bar of GanttGeneral.bars) {
                bar.arrows = GanttGeneral.arrows.filter((arrow) => {
                    return (
                        arrow.from_task.task.id === bar.task.id ||
                        arrow.to_task.task.id === bar.task.id
                    );
                });
            }
        }

        set_width() {
            const cur_width = this.$svg.getBoundingClientRect().width;
            const actual_width = this.$svg
                .querySelector('.grid .grid-row')
                .getAttribute('width');
            if (cur_width < actual_width) {
                this.$svg.setAttribute('width', actual_width);
            }
        }

        set_scroll_position() {
            const parent_element = this.$svg.parentElement;
            if (!parent_element) return;

            const hours_before_first_task = date_utils.diff(
                this.get_oldest_starting_date(),
                this.gantt_start,
                'hour'
            );

            const scroll_pos =
                (hours_before_first_task / this.options.step) *
                this.options.column_width -
                this.options.column_width;

            parent_element.scrollLeft = scroll_pos;
        }

        bind_grid_click() {
            $.on(
                this.$svg,
                this.options.popup_trigger,
                '.grid-row, .grid-header',
                () => {
                    this.unselect_all();
                    this.hide_popup();
                }
            );
        }

        bind_bar_events() {
            let is_dragging = false;
            let x_on_start = 0;
            let y_on_start = 0;
            let is_resizing_left = false;
            let is_resizing_right = false;
            let parent_bar_id = null;
            let bars = []; // instanceof Bar
            this.bar_being_dragged = null;

            function action_in_progress() {
                return is_dragging || is_resizing_left || is_resizing_right;
            }

            $.on(this.$svg, 'mousedown', '.bar-wrapper, .handle', (e, element) => {
                const bar_wrapper = $.closest('.bar-wrapper', element);

                if (element.classList.contains('left')) {
                    is_resizing_left = true;
                } else if (element.classList.contains('right')) {
                    is_resizing_right = true;
                } else if (element.classList.contains('bar-wrapper')) {
                    is_dragging = true;
                }

                bar_wrapper.classList.add('active');

                x_on_start = e.offsetX;
                y_on_start = e.offsetY;

                parent_bar_id = bar_wrapper.getAttribute('data-id');
                const ids = [
                    parent_bar_id,
                    ...this.get_all_dependent_tasks(parent_bar_id),
                ];
                bars = ids.map((id) => this.get_bar(id));

                this.bar_being_dragged = parent_bar_id;

                bars.forEach((bar) => {
                    const $bar = bar.$bar;
                    $bar.ox = $bar.getX();
                    $bar.oy = $bar.getY();
                    $bar.owidth = $bar.getWidth();
                    $bar.finaldx = 0;
                });
            });

            $.on(this.$svg, 'mousemove', (e) => {
                if (!action_in_progress()) return;
                const dx = e.offsetX - x_on_start;
                e.offsetY - y_on_start;

                bars.forEach((bar) => {
                    const $bar = bar.$bar;
                    $bar.finaldx = this.get_snap_position(dx);
                    this.hide_popup();
                    if (is_resizing_left) {
                        if (parent_bar_id === bar.task.id) {
                            bar.update_bar_position({
                                x: $bar.ox + $bar.finaldx,
                                width: $bar.owidth - $bar.finaldx,
                            });
                        } else {
                            bar.update_bar_position({
                                x: $bar.ox + $bar.finaldx,
                            });
                        }
                    } else if (is_resizing_right) {
                        if (parent_bar_id === bar.task.id) {
                            bar.update_bar_position({
                                width: $bar.owidth + $bar.finaldx,
                            });
                        }
                    } else if (is_dragging) {
                        bar.update_bar_position({ x: $bar.ox + $bar.finaldx });
                    }
                });
            });

            document.addEventListener('mouseup', (e) => {
                if (is_dragging || is_resizing_left || is_resizing_right) {
                    bars.forEach((bar) => bar.group.classList.remove('active'));
                }

                is_dragging = false;
                is_resizing_left = false;
                is_resizing_right = false;
            });

            $.on(this.$svg, 'mouseup', (e) => {
                this.bar_being_dragged = null;
                bars.forEach((bar) => {
                    const $bar = bar.$bar;
                    if (!$bar.finaldx) return;
                    bar.date_changed();
                    bar.set_action_completed();
                });
            });

            this.bind_bar_progress();
        }

        bind_bar_progress() {
            let x_on_start = 0;
            let y_on_start = 0;
            let is_resizing = null;
            let bar = null;
            let $bar_progress = null;
            let $bar = null;

            $.on(this.$svg, 'mousedown', '.handle.progress', (e, handle) => {
                is_resizing = true;
                x_on_start = e.offsetX;
                y_on_start = e.offsetY;

                const $bar_wrapper = $.closest('.bar-wrapper', handle);
                const id = $bar_wrapper.getAttribute('data-id');
                bar = this.get_bar(id);

                $bar_progress = bar.$bar_progress;
                $bar = bar.$bar;

                $bar_progress.finaldx = 0;
                $bar_progress.owidth = $bar_progress.getWidth();
                $bar_progress.min_dx = -$bar_progress.getWidth();
                $bar_progress.max_dx = $bar.getWidth() - $bar_progress.getWidth();
            });

            $.on(this.$svg, 'mousemove', (e) => {
                if (!is_resizing) return;
                let dx = e.offsetX - x_on_start;
                e.offsetY - y_on_start;

                if (dx > $bar_progress.max_dx) {
                    dx = $bar_progress.max_dx;
                }
                if (dx < $bar_progress.min_dx) {
                    dx = $bar_progress.min_dx;
                }

                const $handle = bar.$handle_progress;
                $.attr($bar_progress, 'width', $bar_progress.owidth + dx);
                $.attr($handle, 'points', bar.get_progress_polygon_points());
                $bar_progress.finaldx = dx;
            });

            $.on(this.$svg, 'mouseup', () => {
                is_resizing = false;
                if (!($bar_progress && $bar_progress.finaldx)) return;
                bar.progress_changed();
                bar.set_action_completed();
            });
        }

        get_all_dependent_tasks(task_id) {
            let out = [];
            let to_process = [task_id];
            while (to_process.length) {
                const deps = to_process.reduce((acc, curr) => {
                    acc = acc.concat(this.dependency_map[curr]);
                    return acc;
                }, []);

                out = out.concat(deps);
                to_process = deps.filter((d) => !to_process.includes(d));
            }

            return out.filter(Boolean);
        }

        get_snap_position(dx) {
            let odx = dx,
                rem,
                position;

            if (this.view_is(VIEW_MODE.WEEK)) {
                rem = dx % (this.options.column_width / 7);
                position =
                    odx -
                    rem +
                    (rem < this.options.column_width / 14 ?
                        0 :
                        this.options.column_width / 7);
            } else if (this.view_is(VIEW_MODE.MONTH)) {
                rem = dx % (this.options.column_width / 30);
                position =
                    odx -
                    rem +
                    (rem < this.options.column_width / 60 ?
                        0 :
                        this.options.column_width / 30);
            } else {
                rem = dx % this.options.column_width;
                position =
                    odx -
                    rem +
                    (rem < this.options.column_width / 2 ?
                        0 :
                        this.options.column_width);
            }
            return position;
        }

        unselect_all() {
            [...this.$svg.querySelectorAll('.bar-wrapper')].forEach((el) => {
                el.classList.remove('active');
            });
        }

        view_is(modes) {
            if (typeof modes === 'string') {
                return this.options.view_mode === modes;
            }

            if (Array.isArray(modes)) {
                return modes.some((mode) => this.options.view_mode === mode);
            }

            return false;
        }

        get_task(id) {
            return this.tasks.find((task) => {
                return task.id === id;
            });
        }

        get_bar(id) {
            return this.bars.find((bar) => {
                return bar.task.id === id;
            });
        }

        show_popup(options) {
            if (!this.popup) {
                this.popup = new Popup(
                    this.popup_wrapper,
                    this.options.custom_popup_html
                );
            }
            this.popup.show(options);
        }

        hide_popup() {
            this.popup && this.popup.hide();
        }

        trigger_event(event, args) {
            if (this.options['on_' + event]) {
                this.options['on_' + event].apply(null, args);
            }
        }

        /**
         * Gets the oldest starting date from the list of tasks
         *
         * @returns Date
         * @memberof Gantt
         */
        get_oldest_starting_date() {
            return this.tasks
                .map((task) => task._start)
                .reduce((prev_date, cur_date) =>
                    cur_date <= prev_date ? cur_date : prev_date
                );
        }

        /**
         * Clear all elements from the parent svg element
         *
         * @memberof Gantt
         */
        clear() {
            this.$svg.innerHTML = '';
        }
    }

    Gantt.VIEW_MODE = VIEW_MODE;

    function generate_id(task) {
        return task.name + '_' + Math.random().toString(36).slice(2, 12);
    }

    return Gantt;

})();
//# sourceMappingURL=frappe-gantt.js.map