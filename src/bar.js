import date_utils from './date_utils.js';
import FirstTime from './index.js';
//import MouseLeave from './index.js';
import { $, createSVG, animateSVG, createHtmlToSvg } from './svg_utils.js';
//CREAMOS LA CLASE BAR PARA GENERAR LOS LABELS

// VARIABLES GLOBALES
var CircleOutputArrow = null;
var GenerateArrow = false;
var dependenciesFather = null;
var ArrayEncendidos = [];
var indice = 1;
var Change = false;
var ArrayIdFather = [];
var ArrayIdConectorStart = [];
var ElementListener = null;
var GanttGeneral; // VARIABLE VACIA PARA ALMACENAR EL GANTT 

function MouseLeave(event) {
    var BarProgress = event.path[1]; // OBTENEMOS EL CONTENEDOR
    var CircleOutput = BarProgress.getElementsByClassName('CircleOutput');
    var Line = BarProgress.getElementsByClassName('Line');
    //CAMBIAMOS PROPIEDADES
    if (CircleOutput[0].style.fill == "rgb(198, 84, 209)") {
        CircleOutput[0].style.opacity = 1;
        Line[0].style.opacity = 1;

    } else {

        CircleOutput[0].style.opacity = 0;
        Line[0].style.opacity = 0;

    }

}
//////////////////////////
export default class Bar {
    constructor(gantt, task) {
        GanttGeneral = gantt;
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
        this.draw_progress_bar();
        this.draw_bar();
        this.draw_label();
        this.draw_resize_handles();
    }

    draw_bar() {




        /*CREAMOS EL LIENZO PARA LOS CIRCULOS DE CONEXIÓN*/
        //this.draw_progress_bar();

        if (this.task.Father) {
            ArrayIdFather.push(this.task.id); // GUARDAMOS LOS PADRES 

            this.CircleInput = 'CircleInput father';
            this.CircleInputTag = '.CircleInput.father';


        } else {
            this.CircleInput = 'CircleInput son';
            this.CircleInputTag = '.CircleInput.son';
        }


        createSVG('circle', {
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



        createSVG('line', {
            x1: this.x + this.width,
            x2: this.x + this.width + 5,
            y1: this.y + this.height / 2,
            y2: this.y + this.height / 2,
            class: this.Line,
            append_to: this.bar_group,
        });



        createSVG('circle', {
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

        /*************GENERAMOS EL LISTENER PARA LOS HANDLERS**********************/
        if (this.task.name != '') {
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
                    this.bar_group.addEventListener('mouseleave', MouseLeave, false);

                } else {
                    if (!dependenciesFather.includes(this.task.id)) {
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
                            this.bar_group.addEventListener('mouseleave', MouseLeave, false);
                        }




                    }


                }
            } else {


                this.bar_group.addEventListener('mouseover', MouseOver, false);
                if (GanttGeneral.dependency_map[this.task.id] == null | undefined) {
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
            var ControlSons = false;
            var ControlFathers = false;

            //////// LISTENER PARA EL CLICK DEL NODO DE SALIDA... \\\\\\\\\\\
            this.bar_group.getElementsByClassName('CircleOutput')[0].addEventListener('click', (event) => {
                ListFather=GanttGeneral.tasks.filter((obj)=>obj.Father===true);
                if(ListFather.length===1){
                    return; // no hacemos nada
                }
                event.path[1].removeEventListener('mouseleave', MouseLeave, false); // DEJAMOS FIJO LA FLECHA
                ElementListener = event.path[1];
                if (GenerateArrow) {
                    event.path[1].removeEventListener('mouseleave', MouseLeave, false); // DEJAMOS FIJO LA FLECHA
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
                                    GanttGeneral.bars[i].bar_group.childNodes[1].style.opacity = 1;
                                    GanttGeneral.bars[i].bar_group.childNodes[1].style.fill = '#C654D1';
                                    ArrayEncendidos.push(GanttGeneral.bars[i]);
                                    ArrayIdConectorStart.push(GanttGeneral.bars[i].task.id);

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
                                    GanttGeneral.bars[i].bar_group.childNodes[1].style.opacity = 1;
                                    GanttGeneral.bars[i].bar_group.childNodes[1].style.fill = '#C654D1';
                                    ArrayEncendidos.push(GanttGeneral.bars[i]);
                                    ArrayIdConectorStart.push(GanttGeneral.bars[i].task.id); // AGREGAMOS LOS ID DE LOS PADRES

                                }


                            }

                        }

                    }

                    if (GanttGeneral.dependency_map[this.task.id] != undefined || null) {
                        ControlSons = true;
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
                                ControlFathers = true;
                                if (GanttGeneral.bars[b].bar_group.childNodes[1].style.opacity != 1) {
                                    GanttGeneral.bars[b].bar_group.childNodes[1].style.opacity = 0;
                                }
                                //GanttGeneral.bars[b].bar_group.childNodes[0].style.opacity = 0;
                                GanttGeneral.bars[b].bar_group.childNodes[1].style.fill = 'black';
                            }



                        }


                    }
                }
                if (ArrayEncendidos.length != 0) {
                    GenerateArrow = true; // PASAMOS LA VARIABLE PARA INDICAR QUE ESTAMOS EN ESTADO PARA CREAR UNA CONEXIÓN.
                    console.log('CONEXIÓN HABILITADA ESPERANDO NODO RECEPTOR...');
                    CircleOutputArrow = this; // ALMACENAMOS EL ELEMENTO ASOCIADO DE LA TAREA INICIAL.
                    this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "#C654D1";
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








                } else {
                    console.log("ENTRA");
                    GenerateArrow = false;

                    if (this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill != "#C654D1") {
                        this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "black";

                        if (ControlFathers) {
                            this.bar_group.getElementsByClassName('CircleOutput')[0].style.opacity = 0;
                            this.bar_group.getElementsByClassName('Line')[0].style.opacity = 0;
                            event.path[1].addEventListener('mouseleave', MouseLeave, false);

                        }
                    }
                    if (ControlSons) {
                        console.log("ENTRO 2");
                        this.bar_group.getElementsByClassName('CircleOutput')[0].style.opacity = 1;
                        this.bar_group.getElementsByClassName('Line')[0].style.opacity = 1;
                        event.path[1].removeEventListener('mouseleave', MouseLeave, false);
                    }


                }






            }, false);
        }

        //GENERAMOS EL LISTENER PARA LA CONEXIÓN FINAL DE CLICK PARA LA FLECHA.

        document.addEventListener('dblclick', (event) => {
            this.bar_group.getElementsByClassName('CircleOutput')[0].style.fill = "#000";
            if (GenerateArrow) {
                GenerateArrow = false;

                for (var i = 0; i < ArrayEncendidos.length; i++) {
                    if (ArrayEncendidos[i].task.dependencies.length == 0) {
                        ArrayEncendidos[i].bar_group.childNodes[1].style.opacity = 0;
                        ArrayEncendidos[i].bar_group.childNodes[1].style.fill = 'black';
                    } else {
                        if (ArrayEncendidos[i].task.dependencies.length == 1) {
                            ArrayEncendidos[i].bar_group.childNodes[1].style.opacity = 0;
                            ArrayEncendidos[i].bar_group.childNodes[1].style.fill = 'black';

                        } else {
                            ArrayEncendidos[i].bar_group.childNodes[1].style.fill = 'black';

                        }




                    }
                }
                ArrayEncendidos = []; // VACIAMOS EL ARREGLO
                ArrayIdConectorStart = [];

                if (!CircleOutputArrow.task.Father) {
                    //SI ES UN HIJO Y TIENE ALGUNA CONEXIÓN DEJO LOS MARCADORES
                    if (Object.keys(GanttGeneral.dependency_map).includes(CircleOutputArrow.task.id) == false) {
                        //SI NO EXISTE CONEXIÓN
                        CircleOutputArrow.bar_group.childNodes[3].style.opacity = 0;
                        CircleOutputArrow.bar_group.childNodes[3].style.fill = 'black';
                        CircleOutputArrow.bar_group.childNodes[2].style.opacity = 0;
                        CircleOutputArrow.bar_group.childNodes[2].style.fill = 'black';
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

                        CircleOutputArrow.bar_group.childNodes[3].style.opacity = 0;
                        CircleOutputArrow.bar_group.childNodes[3].style.fill = 'black';
                        CircleOutputArrow.bar_group.childNodes[2].style.opacity = 0;
                        CircleOutputArrow.bar_group.childNodes[2].style.fill = 'black';
                        CircleOutputArrow.bar_group.addEventListener('mouseleave', MouseLeave);


                    }



                }




            } else {
                console.log('NO PASA NADA');
            }

        }, false)


        this.bar_group.getElementsByClassName('CircleInput')[0].addEventListener('click', (event) => {

            if (!ArrayIdConectorStart.includes(this.task.id)) {
                return;
            }
            if (GenerateArrow) {
                console.log('CONECTADA');


                /// AL REALIZAR LA CONEXIÓN APAGAMOS LOS NODOS Y DESABILITAMOS LOS QUE NO TIENEN NINGUNA CONEXION

                for (var i = 0; i < ArrayEncendidos.length; i++) {

                    ArrayEncendidos[i].bar_group.childNodes[1].style.fill = 'black';
                    if (ArrayEncendidos[i].task.dependencies.length == 0 && ArrayEncendidos[i].task.id != CircleOutputArrow.task.id) {
                        ArrayEncendidos[i].bar_group.childNodes[1].style.opacity = 0;

                    } else {
                        if (ArrayEncendidos[i].task.dependencies.length == 1 && ArrayEncendidos[i].task.id != CircleOutputArrow.task.id && !ArrayEncendidos[i].task.Father) {
                            ArrayEncendidos[i].bar_group.childNodes[1].style.opacity = 0;

                        }

                    }


                }









                //////////////////////////////////////////////////////////////////////////


                ArrayEncendidos = []; // VACIAMOS EL ARREGLO
                ArrayIdConectorStart = [];
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


                        for (var i = 0; i < GanttGeneral.arrows.length; i++) {
                            GanttGeneral.arrows[i].element.remove();

                        }
                        GanttGeneral.setup_tasks(GanttGeneral.tasks);
                        GanttGeneral.make_arrows();
                        GanttGeneral.map_arrows_on_bars();

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

        createSVG('rect', {
            class: 'extend',
            x: this.x + this.width, // YA QUE NO PODEMOS OBTENERLA DESDE AQUI LA CUADRAMOS ABAJO EN EL RESETEO
            y: this.y,
            width: 30,
            height: this.height,
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
            UrlImag = ''

        } else {
            ClassName = 'bar-label nameSon';
            this.ClassName = '.bar-label.nameSon'
            ClassDate = 'bar-label dateSon';
            this.ClassDate = '.bar-label.dateSon';
            ClassBig = 'bar-label BigCaseSon';
            this.ClassBig = '.bar-label.BigCaseSon';
            UrlImag = '';

        }
        if (this.task.name == '') {
            var classInput;
            if (this.task.Father) {
                classInput = "inputName Father"
            } else {
                classInput = "inputName"
            }
            createSVG('foreignObject', {
                class: 'InputLabel',
                x: position_x,
                y: this.y + this.height / 5,
                width: 200,
                height: 50,
                append_to: this.bar_group,
            });
            createHtmlToSvg('input', {
                    type: 'text',
                    height: '4px',
                    placeholder: 'Ingresa el nombre de la tarea',
                    class: classInput,
                    append_to: this.bar_group.getElementsByClassName('InputLabel')[0],
                })
                // GENERAMOS LISTENER PARA EL INPUT
            this.bar_group.getElementsByClassName('InputLabel')[0].getElementsByClassName('inputName')[0].addEventListener('keyup', function(event) {
                if (event.keyCode === 13) {
                    //GanttGeneral.bars[0].bar_group.task.name=''
                    for (var i = 0; i < GanttGeneral.tasks.length; i++) {

                        var Input = GanttGeneral.bars[i].bar_group.childNodes[5].childNodes[0]
                        if (Input == event.path[0]) {

                            GanttGeneral.bars[i].task.name = event.path[0].value; // REEMPLAZAMOS EL NOMBRE
                            var PositionScroll = GanttGeneral.bars[i].$bar.getX();
                            GenerateArrow = false;
                            break; // SALIMOS DEL CICLO
                        }


                    }
                    //ACTUALIZAMOS EL TASK....
                    PositionScroll = GanttGeneral.GetScrollPosition();
                    GanttGeneral.setup_tasks(GanttGeneral.tasks);

                    // // initialize with default view mode
                    GanttGeneral.change_view_mode();
                    GanttGeneral.bind_events();
                    GanttGeneral.set_scroll_position(PositionScroll);
                }
            })
        } else {
            // SI YA TIENE UN NOMBRE NO CREA NINGUN INPUT SINO DIREMAMENTE EL TEXTO
            createSVG('text', {
                innerHTML: this.task.name,
                class: ClassName,
                x: position_x,
                y: this.y + this.height / 1.7,
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
        /********GENERAMOS EL CLICK PARA EL BOTON DE INFO**************************/
        this.bar_group.addEventListener('mouseover', (event) => {
            GanttGeneral.popup_wrapper.style.visibility = 'visible';
            this.show_popup();

        }, false);
        this.bar_group.addEventListener('mouseleave', (event) => {
            GanttGeneral.popup_wrapper.style.visibility = 'hidden';
            GanttGeneral.hide_popup();

        }, false);



        /**************************************************************************/

        if (this.task.Father && this.task.name != '') {

            createSVG('image', {
                href: '',
                class: 'bar-label InfoImage',
                x: this.x + this.const_name_x + 50, // YA QUE NO PODEMOS OBTENERLA DESDE AQUI LA CUADRAMOS ABAJO EN EL RESETEO
                y: this.y + this.height / 4 - (11 / 6),
                width: 11,
                heigth: 11,
                append_to: this.bar_group,
            });

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
            if (this.task.porcentaje == 100) {
                this.PorcentValueConstant = 45;
            }
            createSVG('text', {
                innerHTML: this.task.porcentaje,
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
                href: 'src/assets/Imag/Grupo354.png',
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
                // CREO UN CICLO PARA GENERAR UN ID Y MIRAR SI ES UNICO PARA LA UNICA TAREA.

                var task = {
                    start: this.task.start, // GENERAMOS CON LA FECHA ACTUAL
                    end: date_utils.add(date_utils.parse(this.task.start), 6, 'day'),
                    name: '',
                    content: '',
                    tablero_id:'',  
                    finished: false,
                    process: 'Pendiente',
                    actividad_padre_id:this.task.id,
                    sprint: '',
                    prioridad: 'Baja',
                    id: 'Task '+indice, // GENERAMOS UN ID INTERNO
                    Father: false,
                    porcentaje: 100,
                    dependencies: [this.task.id],
                    link_deliverables: new Array(),
                    SprintArray: new Array(),
                    responsables: new Array(),
                    subtask: new Array()
                }
                indice = indice + 1;

                //LA AGREGO JUSTO CUANDO EMPIEZA LA TAREA PADRE QUE REQUIERE
                for (var i = 0; i < GanttGeneral.tasks.length; i++) {
                    if (GanttGeneral.bars[i].task.id == this.task.id) {
                        var PositionScroll = GanttGeneral.bars[i].$bar.getX();
                        if (i == GanttGeneral.tasks.length - 1) {
                            GanttGeneral.tasks.push(task); // SI ES LA ULTIMA TAREA LA AGREGAMOS AL FINAL
                            break;
                        } else {
                            GanttGeneral.tasks.splice(i + 1, 0, task); // LA AGREGAMOS JUSTO DESPUES PARA MANTENER LA ESTETICA DEL PROYECTO
                            break;
                        }
                    }
                }
                // CREACIÓN TAREAS..
                PositionScroll = GanttGeneral.GetScrollPosition()
                this.gantt.setup_tasks(this.gantt.tasks);
                GenerateArrow = false;
                this.gantt.change_view_mode();
                GanttGeneral.set_scroll_position(PositionScroll);
                this.gantt.bind_events();
                GanttGeneral.set_scroll_position(PositionScroll);






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
            x: bar.getX() + bar.getWidth() - 10,
            y: bar.getY() + 10,
            width: 3,
            height: this.height - 20,
            rx: 2,
            ry: 2,
            class: 'handle right',
            append_to: this.handle_group,
        });

        createSVG('rect', {
            x: bar.getX() + 5,
            y: bar.getY() + 10,
            width: 3,
            height: this.height - 20,
            rx: 2,
            ry: 2,
            class: 'handle left',
            append_to: this.handle_group,
        });

        createSVG('image', {
            href: 'src/assets/Imag/Grupo359.png',
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

        if ((TaskButtonX - PositionNameFinal) < 2) {
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
            label_4 = this.group.querySelector(this.ClassBig),
            extend = this.group.querySelector('.extend')

        extend.setAttribute('x', bar.getX() + bar.getWidth());
        label.setAttribute('x', bar.getX() + (this.const_name_x));
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
            //label_4.classList.add('big');
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
            //label.classList.add('big');
            //label.setAttribute('x', bar.getX() + bar.getWidth() + 15);

            /* RESPONSIVE PARA LA IMAGEN DE LA FECHA */
            label_3.classList.remove('big');
            label_3.setAttribute('y', bar.getY() + bar.getHeight() / 2.5);
            label_3.setAttribute('x', bar.getX() + (this.const_name_x));

            // /* RESPONSIVE PARA EL TEXTO ... */
            //label_4.classList.add('big');
            //label_4.setAttribute('x', bar.getX() + (this.const_date_x));

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
            .setAttribute('x', bar.getX() + 5);
        this.handle_group
            .querySelector('.handle.right')
            .setAttribute('x', (parseFloat(bar.getAttribute('x')) + bar.getWidth()) - 10);
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

function isFunction(functionToCheck) {
    var getType = {};
    return (
        functionToCheck &&
        getType.toString.call(functionToCheck) === '[object Function]'
    );
}