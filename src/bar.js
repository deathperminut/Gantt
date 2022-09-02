import date_utils from './date_utils';
import { $, createSVG, animateSVG } from './svg_utils';
//CREAMOS LA CLASE BAR PARA GENERAR LOS LABELS
export default class Bar {
    constructor(gantt, task) {
        //RECIBE COMO PARAMETROS LAS TAREAS Y EL GANTT
        this.set_defaults(gantt, task); //FUNCIÓN QUE INICIALIZA COMO ATRIBUTOS LA TAREA Y EL GANTT
        this.prepare(); // PREPARA LOS ATRIBUTOS PARA PONER LAS UBICACIONES EN EL SVG
        this.draw(); // GENERA LOS VECTORES PARA EL SVG
        this.bind();
    }

    set_defaults(gantt, task) {
        this.action_completed = false;
        this.gantt = gantt;
        this.task = task; // SETEAMOS LOS ATRIBUTOS DE LA TAREA
    }

    prepare() {
        this.prepare_values(); // PREPARAMOS LAS VARIABLES DE POSICIÓN
        this.prepare_helpers();
    }

    prepare_values() {
        this.invalid = this.task.invalid; // MIRAR FUNCIONALIDAD***
        this.height = this.gantt.options.bar_height; // DEFINIMOS LA ALTURA DEL LABEL PRINCIPAL POR EL TIEMPO
        this.x = this.compute_x(); // CALCULAMOS LA POSICIÓN INICAL EN X
        this.y = this.compute_y(); // CALCULAMOS LA POSICIÓN INICIAL EN Y
        this.corner_radius = this.gantt.options.bar_corner_radius; // ME DEFINE EL RADIO DE LOS BORDES PARA EL PRINCIPAL
        this.duration =
            date_utils.diff(this.task._end, this.task._start, 'hour') /
            this.gantt.options.step; // DEFINIMOS LA DURACIÓN DE LA TAREA SEGUN EL TIEMPO
        this.width = this.gantt.options.column_width * this.duration; //DEPENDIENDO DEL ANCHO ENVIADO SE MULTIPLICA POR LA DURACIÓN EN TIEMPO CALCULADA
        this.progress_width =
            this.gantt.options.column_width *
            this.duration *
            (this.task.progress / 100) || 0; // SE CALCULA EL ANCHO DE LA BARRA DE PROGRESO
        this.group = createSVG('g', {
            class: 'bar-wrapper ' + (this.task.custom_class || ''),
            'data-id': this.task.id,
        }); // BAR-WRAPPER RESULTA SER EL CONTENEDOR DE LOS LABELS Y CONTENEDOR DE LOS EXTREMOS
        this.bar_group = createSVG('g', {
            class: 'bar-group',
            append_to: this.group,
        }); // CONTENEDOR UNICO DE LOS LABELS-PROGRESS BAR-TEXT
        this.handle_group = createSVG('g', {
            class: 'handle-group',
            append_to: this.group,
        }); //CONTENEDOR DE LOS EXTREMOS
        this.handle_boton = createSVG("g", {
            class: "handle-group",
            append_to: this.group,
        });
        //CONTENEDOR DEL BOTON ASOCIADO.
        this.handle_person = createSVG("g", {
            class: "handle-person",
            append_to: this.group,
            //CONTENEDOR PARA LA IMAGEN DE UNO DE LOS MIEMBROS DEL EQUIPO
        })
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
        this.draw_bar(); // FUNCIÓN PARA DIBUJAR EL LABEL PRINCIPAL
        this.draw_progress_bar(); // FUNCIÓN PARA DIBUJAR LA BARRA DE PROGRESO ASOCIADA AL LABEL
        this.draw_label(); // FUNCIÓN PARA DIBUJAR EL TEXTO
        this.draw_resize_handles(); // FUNCIÓN PARA DIBUJAR LOS EXTREMOS DE CADA LABEL
        //this.draw_boton(); // DIBUJAMOS EL BOTON ASOCIADO AL LABEL PARA AGREGAR TAREAS
        //this.draw_imag(); // DIBUJAMOS LA IMAGEN DE UN INTEGRANTE.
    }
    draw_boton() {
        const bar = this.$bar; // OBTENEMOS LAS CARACTERISTICAS DE LA BARRA.
        const ButtonHeight = this.height * 1.3; // DEFINIMOS LA ALTURA DEL BUTTON.
        const ButtonWidth = this.width / 3 //PEQUEÑO
            //GENERAMOS EL boton
        createSVG('rect', {
            x: bar.getX() + this.width * 0.6, //DEFINIMOS LA POSICIÓN EN X DEL LADO IZQUIERDO
            y: bar.getY() - 5, // DEFINIMOS LA POSICIÓN EN Y.
            width: ButtonWidth, // ANCHO DEFINIDO ARRIBA
            height: ButtonHeight, // ALTURA DEFINIDA ARRIBA
            rx: this.corner_radius, // MISMO RADIO
            ry: this.corner_radius, // MISMO RADIO
            class: 'Boton-Update', // CLASE PARA MODIFICAR EL BOTON
            append_to: this.bar_group, // LO PONEMOS EN EL CONTENEDOR DE HANDLE
        });
    }

    draw_bar() {
        // DIBUJAMOS EL LABEL PRINCIPAL COMO RECT DE UN SVG
        this.$bar = createSVG('rect', {
            x: this.x, // OBTENEMOS LA POSICIÓN EN X DEL LABEL INICIAL
            y: this.y, // OBTENEMOS LA POSICIÓN EN Y DEL LABEL INICIAL
            width: this.width, // DEFINIMOS EL ANCHO REQUERIDO
            height: this.height, // DEFINIMOS EL ALTO RQUERIDO
            rx: this.corner_radius, // DEFINIMOS LA CURVATURA EN X E Y 
            ry: this.corner_radius,
            class: 'bar', // LE ASOCIAMOS UNA CLASE DE BAR PARA EDITARLA 
            append_to: this.bar_group, // AQUI SE AGREGA AL CONTENEDOR BAR_GROUP
        });

        animateSVG(this.$bar, 'width', 0, this.width);
        ///CREADO EL ELEMENTO LE ASOCIAMOS UNA ANIMACIÓN EN CUANTO A ANCHO

        if (this.invalid) {
            this.$bar.classList.add('bar-invalid'); // SI UBICAMOS INVALID NO SE MOVERA EL ANCHO
        }
    }

    draw_progress_bar() {
        if (this.invalid) return; // SI DEFINIMOS EL PARAMETRO INVALID NO TENDRA BARRA DE PROGRESO 
        // CREAMOS LA BARRA DE PROGRESO DE LA MISMA MANERA QUE EL LABEL PRINCIPAL
        this.$bar_progress = createSVG('rect', {
            x: this.x, // DEFINIMOS POSICION PARA EL SVG INICIAL EN X
            y: this.y, // DEFINIMOS POSICIÓN PARA EL SVG INICIAL EN Y
            width: this.progress_width, // ANCHO CORRESPONDIENTE AL PROGRESO
            height: this.height, // ALTURA IGUAL AL LABEL PRINCIPAL
            rx: this.corner_radius, // MISMO RADIO EN X
            ry: this.corner_radius, // MISMO RADIO EN Y
            class: 'bar-progress', // LO ASOCIAMOS A LA CLASE BAR PROGRESS

            append_to: this.bar_group, // Y LO AGREGAMOS AL CONTENEDOR DEL MISMO GROUP
        });

        animateSVG(this.$bar_progress, 'width', 0, this.progress_width); // LE AGREGAMOS UN MOVIMIENTO DINAMICO EN ANCHO
    }

    draw_label() {
        //GENERAMOS EL TEXTO  EN LA MISMA CAPA QUE EL LABEL Y PROGRESS BAR
        createSVG('text', {
            /* DEFINIMOS LA POSICIÓN DE ORIGEN DEL TEXTO
            POR DEFAULT ESTA EN LA MITAD. */
            x: 1000, //this.x + this.width / 4,
            y: this.y + this.height / 2,
            innerHTML: this.task.name, // COMO CONTENIDO PONEMOS LA TAREA A REALIZAR
            class: 'bar-label', // LO AGREGAMOS A LA CLASE BAR-LABEL PARA EL HTML
            append_to: this.bar_group, // LO ASOCIAMOS A LA MISMA CAPA DEL LABEL Y PROGRESS BAR
        });
        // labels get BBox in the next tick
        requestAnimationFrame(() => this.update_label_position()); // ESTA ME ACTUALIZA LA POSICIÓN DEL TEXTO 
    }

    draw_resize_handles() {
        if (this.invalid) return;
        //EN CASO DE SER INVALIDO NO TENDRA BARRAS DE DESPLAZAMIENTO

        const bar = this.$bar; // GENERO UNA CONSTANTE ASOCIADO A LA BARRA
        const handle_width = 8; // DEFINO UN ANCHO PARA LAS BARRAS

        createSVG('rect', {
            x: bar.getX() + bar.getWidth() - 9, //DEFINIMOS LA POSICIÓN EN X DEL LADO IZQUIERDO
            y: bar.getY() + 1, // DEFINIMOS LA POSICIÓN EN Y.
            width: handle_width, // ANCHO DEFINIDO COMO CONSTANTE ARRIBA
            height: this.height - 2, // ALTURA MENOR A LA ORIGINAL????'
            rx: this.corner_radius, // MISMO RADIO
            ry: this.corner_radius, // MISMO RADIO
            class: 'handle right', // CLASE PARA HANDLE RIGHT
            append_to: this.handle_group, // LO PONEMOS EN EL CONTENEDOR DE HANDLE
        });

        createSVG('rect', {
            x: bar.getX() + 1,
            y: bar.getY() + 1,
            width: handle_width,
            height: this.height - 2,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'handle left',
            append_to: this.handle_group,
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

            this.show_popup(); // MOSTRAMOS LA VENTANA EMERGENTE EN CASO DE CLICK
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
        this.update_label_position();
        this.update_handle_position();
        this.update_progressbar_position();
        this.update_arrow_position();
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

        if (!changed) return;

        this.gantt.trigger_event('date_change', [
            this.task,
            new_start_date,
            date_utils.add(new_end_date, -1, 'second'),
        ]);
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
        const new_end_date = date_utils.add(
            new_start_date,
            width_in_units * this.gantt.options.step,
            'hour'
        );

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
            this.$bar.getWidth() * (this.task.progress / 100)
        );
    }

    update_label_position() {
        const bar = this.$bar,
            label = this.group.querySelector('.bar-label');

        if (label.getBBox().width > bar.getWidth()) {
            label.classList.add('big');
            label.setAttribute('x', bar.getX() + bar.getWidth() + 5); // PUEDO CAMBIAR EL ANCHO
        } else {
            label.classList.remove('big');
            label.setAttribute('x', bar.getX() + bar.getWidth() / 2);
        }
    }

    update_handle_position() {
        const bar = this.$bar;
        this.handle_group
            .querySelector('.handle.left')
            .setAttribute('x', bar.getX() + 1);
        this.handle_group
            .querySelector('.handle.right')
            .setAttribute('x', bar.getEndX() - 9);
        const handle = this.group.querySelector('.handle.progress');
        handle &&
            handle.setAttribute('points', this.get_progress_polygon_points());
    }

    update_arrow_position() {
        this.arrows = this.arrows || [];
        for (let arrow of this.arrows) {
            arrow.update();
        }
    }
}

function isFunction(functionToCheck) {
    var getType = {};
    return (
        functionToCheck &&
        getType.toString.call(functionToCheck) === '[object Function]'
    );
}