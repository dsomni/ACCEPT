const UserSchema = require('../config/models/User');
const bcrypt = require("bcryptjs")

module.exports = User = class User {
  constructor(user) {
    if (user) {
      this.name = user.name;
      this.login = user.login;
      this.password = user.password;
      this.isTeacher = user.isTeacher;
      this.grade = user.grade;
      this.group = user.group;
      this.gradeLetter = user.gradeLetter.toLowerCase();
      this.fullgrade = this.grade + this.gradeLetter;
      this.attempts = user.attempts;
      this.verdicts = user.verdicts;
      this.modified = [];
    } else {
      this.name = "";
      this.login = "";
      this.password = "";
      this.isTeacher = false;
      this.grade = "";
      this.group = "";
      this.gradeLetter = user.gradeLetter;
      this.fullgrade = "";
      this.attempts = [];
      this.verdicts = [];
    }
  }
  static async init(login) {
    let user = await UserSchema.findOne({ login: login });
    if (user)
      return new User(user);
    else
      return undefined;
  }
  async save() {
    let user = await UserSchema.findOne({ login: this.login });
    console.log(user)
    if (user) {
      user.name = this.name;
      user.isTeacher = this.isTeacher;
      user.grade = this.grade;
      user.gradeLetter = this.gradeLetter;
      user.attempts = this.attempts;
      user.verdicts = this.verdicts;
      user.group = this.group;
      user.markModified(this.modified);
      await user.save();
    } else {
      await UserSchema.insertMany([{
        login: this.login,
        name: this.name,
        password: this.password,
        grade: this.grade,
        gradeLetter: this.gradeLetter,
        group: this.group,
        isTeacher: this.isTeacher,
        attempts: this.attempts,
        verdicts: this.verdicts,
      }])
    }
    return this;
  }
  markModified(modified) {
    if (typeof modified == "string")
      modified = [modified];
    this.modified = this.modified.concat(modified);
  }
  getAttempt(date) {
    let attempt;
    for (let i = 0; i < this.attempts.length; i++) {
      if (this.attempts[i].date == date) {
        attempt = this.attempts[i];
        break;
      }
    }
    return attempt
  }
  getVerdict(taskID) {
    let verdict = this.verdicts.find(item => item.taskID == taskID);
    if (!verdict) {
      verdict = "-"
    } else {
      verdict = verdict.result;
    }
    return verdict;
  }
  setGroup(group) {
    this.group = group;
    this.modified.push("group");
  }
  checkAndSetPassword(password) {
    if (password.length != 0 && password.length>5 && !password.includes(" ")) {
      this.password = bcrypt.hashSync(password, 10);
      this.modified.push("password");
      return true
    } else {
      return false
    }
  }
  setName(name) {
    this.name = name
    this.modified.push("name");
  }
  setVerdicts(verdicts) {
    this.verdicts = verdicts;
    this.modified.push("verdicts");
  }
  setGrade(grade) {
    if (!this.isTeacher) {
      this.grade = grade;
      this.fullGrade = this.grade + this.gradeLetter;
      this.modified.push("grade");
    }
  }
  setGradeLetter(gradeLetter) {
    if (!this.isTeacher) {
      this.grade = gradeLetter;
      this.fullGrade = this.grade + this.gradeLetter;
      this.modified.push("gradeLetter");
    }
  }
  setLogin(login) {
    if (this.login.length == 0) {
      this.login = login;
    }
  }
  setFullGrade(grade) {
    if (!this.isTeacher) {
      this.fullGrade = grade.toLowerCase();
      this.gradeLetter = grade[grade.length - 1];
      this.grade = grade.slice(0, grade.length - 1);
    }
  }
}