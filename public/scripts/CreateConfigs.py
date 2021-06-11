def parser(text):
    fin_text = ""
    tabs = 0
    colon = False
    quote = False
    for el in text:
        if(el=="{"):
            if(not quote):
                tabs+=1
                colon = False
            fin_text+="{"
        elif(el=="}"):
            if(not quote):
                tabs-=1
                colon = False
                fin_text += "\n"
                fin_text += "\t" * tabs
            fin_text += "}"
        elif (el==":"):
            if(not quote):
                colon = True
            fin_text+=":"
        elif (el==","):
            if (not quote):
                colon = False
            fin_text+=","
        elif(el=="\'" or el=="\""):
            if(not quote and not colon):
                fin_text+="\n"
                fin_text += "\t" * tabs
            quote = not quote
            if(colon):
                fin_text+="\""
        else:
            fin_text+=el

    return fin_text

config = {
    "sessionLiveTime": 45*60,
    "logsLigeTime": 14, #days
    'port': "3000", # server port
    'secret': "secret",
    'FolderLifeTime': 0.7 * 60 * 1000, # milliseconds
    'maxThreadsTests': 10, #number of test managing simultaneously
    'maxThreadsTasks': 1, #number of tasks managing simultaneously
    'onPage':{
		'newsMainList': 5,
		'newsList': 10,#
		'tasksList': 25,#
		'lessonsList': 20,#
		'tournamentsList': 20,#
		'studentsList': 50,#
		'attemptsList': 25#
	},
    'mongodbConfigs': {
        'dbName': "db", # mongodb data base name
        'Host': "localhost:27017", # where data base located(default: "localhost:27017")
        'User': { # mongodb user with Read and Write permissions or leave empty
                'Username': "",
                'Password': "",
               },
        'CollectionNames': { # names of collections
                          'users': "users", # with users
                          'news': "news", # with news
                          'tasks': "tasks", # with tasks
                          'lessons': "lessons", # with lessons
                          'tournament': "tournaments", # with tournaments
                          'quizzes': "quizzes" # with quizzes
                          }
    },
}
port = input("Port(number): ")
sessionLiveTime = input("Session Live Time(seconds): ")
FolderLifeTime = input("FolderLifeTime: ")
logsLifeTime = input("LogsLifeTime(days): ")
maxThreadsTests = input("maxThreadsTests: ")
maxThreadsTasks = input("maxThreadsTasks: ")
secret = input("secret: ")
answer0 = input("Do you want to configure number of elements on pages?(y/n): ")
if answer0.upper() == "Y":
    newsMain = input("newsMainList: ")
    newsList = input("newsList: ")
    tasks = input("tasksList: ")
    lessons = input("lessonsList: ")
    tournaments = input("tournamentsList: ")
    students = input("studentsList: ")
    attempts = input("attemptsList: ")
answer1 = input("Do you want to configure DB?(y/n): ")
if answer1.upper() == "Y":
    dbName = input("dbName: ")
    Host = input("Host: ")
    answer2 = input(
        "Do you want to create user with RW permission only?(y/n): ")
    if answer2.upper() == "Y":
        Username = input("Username: ")
        Password = input("Password: ")
    answer3 = input("Do tou want to customize collection names?(y/n): ")
    if answer3.upper() == "Y":
        users = input("users: ")
        news = input("news: ")
        tasks = input("tasks: ")
        lessons = input("lessons: ")
        tournament = input("tournament: ")
        quizzes = input("quizzes: ")

if (port):
    config["port"] = port
if (sessionLiveTime):
    config["sessionLiveTime"] = int(eval(sessionLiveTime))
if (FolderLifeTime):
    config["FolderLifeTime"] = int(eval(FolderLifeTime))
if (logsLifeTime):
    config["logsLifeTime"] = int(eval(logsLifeTime))
if (maxThreadsTests):
    config["maxThreadsTests"] = int(eval(maxThreadsTests))
if (maxThreadsTasks):
    config["maxThreadsTasks"] = int(eval(maxThreadsTasks))
if (secret):
    config["secret"] = secret
if answer0.upper() == "Y":
        if (newsMain):
            config["onPage"]["newsMainList"] = int(newsMain)
        if (newsList):
            config["onPage"]["newsList"] = int(newsList)
        if (tasks):
            config["onPage"]["tasksList"] = int(tasks)
        if (lessons):
            config["onPage"]["lessonsList"] = int(lessons)
        if (tournaments):
            config["onPage"]["tournamentsList"] = int(tournaments)
        if (students):
            config["onPage"]["studentsList"] = int(students)
        if (attempts):
            config["onPage"]["attemptsList"] = int(attempts)
if answer1.upper() == "Y":
    if (dbName):
        config["mongodbConfigs"]["dbName"] = dbName
    if (Host):
        config["mongodbConfigs"]["Host"] = Host
    if answer2.upper() == "Y":
        if (Username):
            config["mongodbConfigs"]["User"]["Username"] = Username
        if (Password):
            config["mongodbConfigs"]["User"]["Password"] = Password
    if answer3.upper() == "Y":
        if (users):
            config["mongodbConfigs"]["CollectionNames"]["users"] = users
        if (news):
            config["mongodbConfigs"]["CollectionNames"]["news"] = news
        if (tasks):
            config["mongodbConfigs"]["CollectionNames"]["tasks"] = tasks
        if (lessons):
            config["mongodbConfigs"]["CollectionNames"]["lessons"] = lessons
        if (tournament):
            config["mongodbConfigs"]["CollectionNames"]["tournament"] = tournament
        if (quizzes):
            config["mongodbConfigs"]["CollectionNames"]["quizzes"] = quizzes

f = open("".join(i+'/' for i in __file__.split("/")
                 [:-3])+"config/configs.js", "w+")
text = str(config)
f.write("//please, names of fields HAVE TO BE UNIQUE!!!\n" + "module.exports = "+parser(text))
