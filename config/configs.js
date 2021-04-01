module.exports = {
	PathToUsersList: "PATH", 
	PathToTeachersList: "PATH", 
	port: "3000", 
	secret: "secret", 
	FolderLifeTime: 36000, 
	mongodbConfigs: {
		dbName: "db", 
		Host: "localhost:27017", 
		User: {
			Username: "username", 
			Password: "password"
		}, 
		CollectionNames: {
			users: "users", 
			news: "news", 
			tasks: "tasks", 
			lessons: "lessons", 
			tournament: "tournaments"
		}
	}
}