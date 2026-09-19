'use strict';

(function(){

class QuizComponent {
  constructor($http) {
    this.http=$http;
    this.currentQuestion={};
    this.quizIndex=-1;
    this.rightOrWrong=[];
    this.right=[];
    this.wrong=[];
  }
  
  $onInit(){
    this.http.get('/api/questions').then(res=>{
      this.questions=_.shuffle(res.data);
      console.log(this.questions);
      this.nextQuestion();
    });
  }
  
  checkAnswer(answerIndex){
    let question=this.currentQuestion;
    if (answerIndex===question.correctIndex) {
      //alert('Correct');
      this.rightOrWrong[this.quizIndex]=this.rightOrWrong[this.quizIndex]||"correct";
      this.right[answerIndex]="right";
      return true;
    }
    //alert('Incorrect');
    this.rightOrWrong[this.quizIndex]=this.rightOrWrong[this.quizIndex]||"incorrect";
    this.wrong[answerIndex]="wrong";
    return false;
  }
  
  previousQuestion(){
    if (this.quizIndex<=0) return;
    this.quizIndex--;
    this.currentQuestion=this.setMultipleChoice(this.questions[this.quizIndex]);
    this.right=[];
    this.wrong=[];
  }
  
  nextQuestion(){
    this.quizIndex++;
    if (this.quizIndex>(this.questions.length-1)) {
      this.rightOrWrong=[];
      this.quizIndex=-1;
      this.questions=_.shuffle(this.questions);
      this.nextQuestion();
    }
    this.currentQuestion=this.setMultipleChoice(this.questions[this.quizIndex]);
    this.right=[];
    this.wrong=[];
  }
  
  getProgress(){
    let number = this.quizIndex+1;
    if (!this.questions) return;
    return number + ' of ' + this.questions.length;
  }
  
  getCorrect(){
    let correct=0;
    let incorrect=0;
    this.rightOrWrong.forEach(q=>{
      if (q==="correct") correct++;
      if (q==="incorrect") incorrect++;
    });
    let total = correct + incorrect;
    return correct + " correct out of " + total + " answered.";
  }
  
  setMultipleChoice(question){
    let possibleAnswers=[];
    for (let i=1;i<7;i++) {
      if (question["wrong"+i]&&question["wrong"+i]!=="") possibleAnswers.push(question["wrong"+i]);
    }
    question.fourAnswers=_.shuffle(possibleAnswers).slice(0,3);
    question.fourAnswers.push(question.answer);
    question.fourAnswers=_.shuffle(question.fourAnswers);
    question.correctIndex=question.fourAnswers.indexOf(question.answer);
    return question;
  }
}

angular.module('plistCsvApp')
  .component('quiz', {
    templateUrl: 'app/quiz/quiz.html',
    controller: QuizComponent,
    controllerAs: 'quiz'
  });

})();
