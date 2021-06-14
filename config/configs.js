//please, names of fields HAVE TO BE UNIQUE!!!
module.exports = {
	"sessionLiveTime": "2700",
	"logsLifeTime": "12",
	"port": "3000",
	"secret": "secret",
	"FolderLifeTime": "42000",
	"maxThreadsTests": "10",
	"maxThreadsTasks": "5",
	"onPage": {
		"newsMainList": "5",
		"newsList": "10",
		"tasksList": "25",
		"lessonsList": "20",
		"tournamentsList": "15",
		"studentsList": "30",
		"attemptsList": "20"
	},
	"mongodbConfigs": {
		"dbName": "db",
		"Host": "localhost:27017",
		"User": {
			"Username": "username",
			"Password": "password"
		},
		"CollectionNames": {
			"users": "users",
			"news": "news",
			"tasks": "tasks",
			"lessons": "lessons",
			"tournament": "tournaments",
			"quizzes": "quizzes"
		}
	},
	"admins": [
		"0"
	]
}