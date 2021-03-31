config = {
    "PathToUsersList": "PATH", # Path to users.xlsx file
    "PathToTeachersList": "PATH", # Path to teachers.xlsx file
    "port": "3000", # server port
    "secret": 'secret',
    "FolderLifeTime": 0.7 * 60 * 1000, # milliseconds
    "mongodbConfigs": {
        "dbName": "db", # mongodb data base name
        "Host": "localhost:27017", # where data base located(default: "localhost:27017")
        "User": { # mongodb user with Read and Write permissions or leave empty
                "Username": "username",
                "Password": "password",
               },
        "CollectionNames": { # names of collections
                          "users": "users", # with users
                          "news": "news", # with news
                          "tasks": "tasks", # with tasks
                          "lessons": "lessons", # with lessons
                          "tournament": "tournaments"
                          }
    },
}
port = input("Port(number): ")
FolderLifeTime = input("FolderLifeTime: ")
secret = input("secret: ")
PathToUsersList = input("PathToUsersList: ")
PathToTeachersList = input("PathToTeachersList: ")
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

if (port):
    config["port"] = port
if (FolderLifeTime):
    config["FolderLifeTime"] = FolderLifeTime
if (PathToUsersList):
    config["PathToUsersList"] = PathToUsersList
if (PathToTeachersList):
    config["PathToTeachersList"] = PathToTeachersList
if (secret):
    config["secret"] = secret
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

f = open("".join(i+'/' for i in __file__.split("/")
                 [:-3])+"config/configs.js", "w+")
f.write("module.exports = "+str(config).replace("}", "}\n").replace("{", "{\n").replace(",", ",\n"))
