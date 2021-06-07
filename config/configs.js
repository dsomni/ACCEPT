module.exports = {
	PathToUsersList: "PATH",
	PathToDeleteUsersList: "PATH",
	PathToTeachersList: "PATH",
	sessionLiveTime: 2700,
	port: "3000",
	secret: "secret",
	FolderLifeTime: 42000.0,
	maxThreadsTests: 10,
	maxThreadsTasks: 1,
	onPage: {
		newsMain: 5,
		newsList: 10,
		tasks: 25,
		lessons: 20,
		tournaments: 20,
		students: 50,
		attempts: 25
	},
	mongodbConfigs: {
		dbName: "db",
		Host: "localhost:27017",
		User: {
			Username: "",
			Password: ""
		},
		CollectionNames: {
			users: "users",
			news: "news",
			tasks: "tasks",
			lessons: "lessons",
			tournament: "tournaments",
			quizzes: "quizzes"
		}
	}
}