import { createSVG } from './svg_utils.js';

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


/// CREAMOS UNA VARIABLE GENERAL GANTT PARA LOS EJERCICIOS


var GanttGeneral = null;

export default class Arrow {
    constructor(gantt, from_task, to_task) {
        GanttGeneral = gantt;
        this.gantt = gantt; // TENEMOS EL GANK
        this.from_task = from_task; // TENEMOS LA TAREA PRINCIPAL
        this.to_task = to_task;
        this.generateConector();
        this.calculate_path();
        this.draw();
    }
    generateConector() {


        var CircleOutput = this.from_task.bar_group.childNodes[3];
        var CircleInput = this.to_task.bar_group.childNodes[1];
        var Line = this.from_task.bar_group.childNodes[2];
        CircleOutput.style.opacity = 1;
        Line.style.opacity = 1;
        console.log('CULPABLE 3');
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
            console.log(GanttGeneral);
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


            // AHORA DESACTIVAMOS EL NODO DE INPUT SI NO TIENEN NINGUNA OTRA DEPENDENCIA.
            // DESACTIVAMOS LA SEÑAL DE X SI O SI.
            // DESACTIVAMOS EL NODO DE SALIDA DEL PADRE EN CASO DE QUE NO SEA PADRE DE OTRA PADRE.
            var ArrayFathers = [];
            for (var i = 0; i < GanttGeneral.tasks.length; i++) {


                /// PARA LOS PADRES ////////
                if (GanttGeneral.bars[i].task.Father) {
                    ArrayFathers.push(GanttGeneral.bars[i].task.id); // GUARDAMOS LOS PADRES
                }
            }
            for (var i = 0; i < GanttGeneral.tasks.length; i++) {

                if (GanttGeneral.bars[i].task.id != null | '' && GanttGeneral.bars[i].task.id == this.to_task.task.id && GanttGeneral.bars[i].task.Father && GanttGeneral.bars[i].task.dependencies.length == 0) {
                    // ELIMINAMOS LOS NODOS CONECTORES DE LOS PADRES JUNTO A LA CRUZ EN CASO DE QUE SEA UN PADRE SIN DEPENDENCIAS
                    GanttGeneral.bars[i].handle_group.childNodes[2].style.visibility = 'hidden';
                    GanttGeneral.bars[i].bar_group.childNodes[1].style.opacity = 0;
                }


                if (GanttGeneral.bars[i].task.id == this.from_task.task.id && GanttGeneral.bars[i].task.Father) {
                    var CF = false;
                    /// MIRAMOS SI LAS DEPENDENCIAS_MAP DEL PADRE TIENE ALGUN PADRE UNIDO A ALGUN PADRE
                    for (var j = 0; j < GanttGeneral.dependency_map[this.from_task.task.id].length; j++) {

                        if (ArrayFathers.includes(GanttGeneral.dependency_map[this.from_task.task.id][j])) {
                            console.log()

                            CF = true;
                            break;
                        }

                    }
                    if (!CF) {
                        console.log('ESTE ES EL HPT');
                        GanttGeneral.bars[i].bar_group.childNodes[2].style.opacity = 0;
                        GanttGeneral.bars[i].bar_group.childNodes[3].style.opacity = 0;
                        GanttGeneral.bars[i].bar_group.addEventListener('mouseleave', MouseLeave, false);

                    }

                }

                /// PARA LAS HIJAS //////
                if (GanttGeneral.bars[i].task.id == this.from_task.task.id && GanttGeneral.dependency_map[this.from_task.task.id].length == 0 && !GanttGeneral.bars[i].task.Father) {
                    GanttGeneral.bars[i].bar_group.childNodes[2].style.opacity = 0;
                    GanttGeneral.bars[i].bar_group.childNodes[3].style.opacity = 0;
                    GanttGeneral.bars[i].bar_group.addEventListener('mouseleave', MouseLeave, false);
                }

                if (GanttGeneral.bars[i].task.id == this.to_task.task.id && !GanttGeneral.bars[i].task.Father && GanttGeneral.bars[i].task.dependencies.length == 1) {
                    // ELIMINAMOS LOS NODOS CONECTORES DE LOS PADRES JUNTO A LA CRUZ EN CASO DE QUE SEA UN PADRE SIN DEPENDENCIAS
                    GanttGeneral.bars[i].handle_group.childNodes[2].style.visibility = 'hidden';
                    GanttGeneral.bars[i].bar_group.childNodes[1].style.opacity = 0;
                }




            }
            ///ELIMINAMOS EL PATH DEL GANTT////////////////////////////
            for (var i = 0; i < GanttGeneral.layers.arrow.childNodes.length; i++) {


                if (GanttGeneral.layers.arrow.childNodes[i].dataset['from'] == this.from_task.task.id && GanttGeneral.layers.arrow.childNodes[i].dataset['to'] == this.to_task.task.id) {

                    GanttGeneral.layers.arrow.childNodes[i].remove()
                }

            }
            //////////////////////////////////////////////////////////

            GanttGeneral.setup_tasks(GanttGeneral.tasks);



        });


        this.element.addEventListener('mouseleave', (event) => {
            this.element.style.stroke = '#6149CD';
            this.to_task.handle_group.childNodes[2].style.visibility = 'hidden';

        }, false)
    }


    update() {
        this.calculate_path();
        //this.generateConector();
        this.element.setAttribute('d', this.path);

    }
}