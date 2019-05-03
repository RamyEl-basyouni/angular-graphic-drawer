import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import 'fabric';
declare const fabric: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private canvas: any;
  private props: any = {
    canvasFill: '#ffffff',
    canvasImage: '',
    id: null,
    opacity: null,
    fill: null,
    fontSize: null,
    lineHeight: null,
    charSpacing: null,
    fontWeight: null,
    fontStyle: null,
    textAlign: null,
    fontFamily: null,
    TextDecoration: ''
  };

  public textString: string;
  public url: string = '';
  public size: any = {
    width: 500,
    height: 800
  };

  public json: any;
  private globalEditor: boolean = false;
  private textEditor: boolean = false;
  private imageEditor: boolean = false;
  private figureEditor: boolean = false;
  public selected: any;
  private itemsCollection: AngularFirestoreCollection<any>;
  items: Observable<any[]>;

  constructor(private afs: AngularFirestore) {
    this.itemsCollection = afs.collection<any>('shapes');
  }

  ngOnInit() {
    //setup front side canvas
    this.canvas = new fabric.Canvas('canvas', {
      hoverCursor: 'pointer',
      selection: true,
      selectionBorderColor: 'blue'
    });

    this.itemsCollection.valueChanges().subscribe(res => {
      console.log('firebase canvas' + res[0]);
      this.loadCanvasFromJSON(res[0].data);
    });

    this.canvas.on({
      'object:moving': (e: any) => {},
      'object:modified': (e: any) => {},
      'object:selected': (e: any) => {
        let selectedObject = e.target;
        this.selected = selectedObject;
        selectedObject.hasRotatingPoint = true;
        selectedObject.transparentCorners = false;
        // selectedObject.cornerColor = 'rgba(255, 87, 34, 0.7)';
        this.resetPanels();
        if (selectedObject.type !== 'group' && selectedObject) {
          this.getId();
          this.getOpacity();

          switch (selectedObject.type) {
            case 'rect':
            case 'circle':
            case 'triangle':
              this.figureEditor = true;
              // this.getFill();
              break;
            case 'i-text':
              this.textEditor = true;

              break;
            case 'image':
              console.log('image');
              break;
          }
        }
      },
      'selection:cleared': (e: any) => {
        this.selected = null;
        this.resetPanels();
      }
    });

    this.canvas.setWidth(this.size.width);
    this.canvas.setHeight(this.size.height);
  }

  addPolygon(polygon: any) {
    const data = JSON.parse(JSON.stringify(polygon));
    this.itemsCollection.add({ data });
  }

  //Block "Upload Image"
  addImageOnCanvas(url: any) {
    if (url) {
      fabric.Image.fromURL(url, (image: any) => {
        image.set({
          left: 10,
          top: 10,
          angle: 0,
          padding: 10,
          cornersize: 10,
          hasRotatingPoint: true
        });
        image.setWidth(200);
        image.setHeight(200);
        this.extend(image, this.randomId());
        this.canvas.add(image);
        this.selectItemAfterAdded(image);
      });
    }
  }

  readUrl(event: any) {
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      reader.onload = event => {
        this.url = event.target['result'];
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  }

  removeWhite(url: any) {
    this.url = '';
  }

  //Block "Add figure"

  addFigure(figure: any) {
    let add: any;
    switch (figure) {
      case 'rectangle':
        add = new fabric.Rect({
          width: 200,
          height: 100,
          left: 10,
          top: 10,
          angle: 0,
          fill: '#3f51b5'
        });
        break;
      case 'square':
        add = new fabric.Rect({
          width: 100,
          height: 100,
          left: 10,
          top: 10,
          angle: 0,
          fill: '#4caf50'
        });
        break;
      case 'triangle':
        add = new fabric.Triangle({
          width: 100,
          height: 100,
          left: 10,
          top: 10,
          fill: '#2196f3'
        });
        break;
      case 'circle':
        add = new fabric.Circle({
          radius: 50,
          left: 10,
          top: 10,
          fill: '#ff5722'
        });
        break;
    }
    this.extend(add, this.randomId());
    this.canvas.add(add);
    this.selectItemAfterAdded(add);
  }

  cleanSelect() {
    this.canvas.deactivateAllWithDispatch().renderAll();
  }

  selectItemAfterAdded(obj: any) {
    // this.canvas.deactivateAllWithDispatch().renderAll();
    this.canvas.setActiveObject(obj);
  }

  setCanvasFill() {
    if (!this.props.canvasImage) {
      this.canvas.backgroundColor = this.props.canvasFill;
      this.canvas.renderAll();
    }
  }

  extend(obj: any, id: any) {
    obj.toObject = (function(toObject) {
      return function() {
        return fabric.util.object.extend(toObject.call(this), {
          id: id
        });
      };
    })(obj.toObject);
  }

  setCanvasImage() {
    let self = this;
    if (this.props.canvasImage) {
      this.canvas.setBackgroundColor({ source: this.props.canvasImage, repeat: 'repeat' }, function() {
        // self.props.canvasFill = '';
        self.canvas.renderAll();
      });
    }
  }

  randomId() {
    return Math.floor(Math.random() * 999999) + 1;
  }

  /*------------------------Global actions for element------------------------*/

  getActiveStyle(styleName: any, object: any) {
    object = object || this.canvas.getActiveObject();
    if (!object) return '';

    return object.getSelectionStyles && object.isEditing
      ? object.getSelectionStyles()[styleName] || ''
      : object[styleName] || '';
  }

  setActiveStyle(styleName: any, value: any, object: any) {
    object = object || this.canvas.getActiveObject();
    if (!object) return;

    if (object.setSelectionStyles && object.isEditing) {
      var style = {};
      style[styleName] = value;
      object.setSelectionStyles(style);
      object.setCoords();
    } else {
      object.set(styleName, value);
    }

    object.setCoords();
    this.canvas.renderAll();
  }

  getActiveProp(name: any) {
    var object = this.canvas.getActiveObject();
    if (!object) return '';

    return object[name] || '';
  }

  setActiveProp(name: any, value: any) {
    var object = this.canvas.getActiveObject();
    if (!object) return;
    object.set(name, value).setCoords();
    this.canvas.renderAll();
  }

  getId() {
    this.props.id = this.canvas.getActiveObject().toObject().id;
  }

  setId() {
    let val = this.props.id;
    let complete = this.canvas.getActiveObject().toObject();
    console.log(complete);
    this.canvas.getActiveObject().toObject = () => {
      complete.id = val;
      return complete;
    };
  }

  getOpacity() {
    this.props.opacity = this.getActiveStyle('opacity', null) * 100;
  }

  /*System*/
  removeSelected() {
    let activeObject = this.canvas.getActiveObject();
    // activeGroup = this.canvas.getActiveGroup();

    if (activeObject) {
      this.canvas.remove(activeObject);
      // this.textString = '';
    }
    // else if (activeGroup) {
    //   let objectsInGroup = activeGroup.getObjects();
    //   this.canvas.discardActiveGroup();
    //   let self = this;
    //   objectsInGroup.forEach(function (object: any) {
    //     self.canvas.remove(object);
    //   });
    // }
  }

  confirmClear() {
    if (confirm('Are you sure?')) {
      this.canvas.clear();
    }
  }

  rasterize() {
    if (!fabric.Canvas.supports('toDataURL')) {
      alert("This browser doesn't provide means to serialize canvas to an image");
    } else {
      var image = new Image();
      var w = window.open('');
      w.document.write(image.outerHTML);
    }
  }

  rasterizeSVG() {
    var w = window.open('');
    w.document.write(this.canvas.toSVG());
  }

  saveCanvasToJSON() {
    let json = JSON.stringify(this.canvas);
    this.addPolygon(json);
    localStorage.setItem('Kanvas', json);
  }

  loadFromLocalStorage() {
    let canvas = localStorage.getItem('Kanvas');
    console.log('local storage canvas' + canvas);
    this.canvas.loadFromJSON(canvas, () => {
      this.canvas.renderAll();
    });
  }

  loadCanvasFromJSON(items) {
    this.canvas.loadFromJSON(items, () => {
      this.canvas.renderAll();
    });
  }

  rasterizeJSON() {
    this.json = JSON.stringify(this.canvas, null, 2);
  }

  resetPanels() {
    this.textEditor = false;
    this.imageEditor = false;
    this.figureEditor = false;
  }
}
