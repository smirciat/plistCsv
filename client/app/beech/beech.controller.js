'use strict';

(function(){

class BeechComponent {
  constructor($http) {
    this.http=$http;
    this.newQuestion={};
    this.questions=[];
  }
  
  $onInit(){
    this.http.get('/api/questions').then(res=>{
      this.questions=res.data;
    });
  }
  
  update(){
    let question=this.newQuestion;
    if (question._id) {
      let index = this.questions.map(e => e._id).indexOf(question._id);
      this.http.patch('/api/questions/' + question._id,question).then(res=>{
        this.questions.splice(index,1);
        this.questions.unshift(res.data);
        this.newQuestion={};
      });
    }
    else {
      this.http.post('/api/questions',question).then(res=>{
        this.questions.unshift(res.data);
        this.newQuestion={};
      });
    }
  }
  
  cancel(){
    this.newQuestion={};
  }
  
  edit(id){
    let index = this.questions.map(e => e._id).indexOf(id);
    this.newQuestion=JSON.parse(JSON.stringify(this.questions[index]));
  }
  
  delete(id){
    let index = this.questions.map(e => e._id).indexOf(id);
    this.http.delete('/api/questions/'+id).then(res=>{
      this.questions.splice(index,1);
      
    });
  }
}

angular.module('plistCsvApp')
  .component('beech', {
    templateUrl: 'app/beech/beech.html',
    controller: BeechComponent,
    controllerAs: 'beech'
  });

})();
