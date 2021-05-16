module.exports = {
	PathToUsersList: "/home/rostislav/Downloads/users.xlsx",
	PathToTeachersList: "PATH",
	port: "3000", 
	secret: "secret", 
	FolderLifeTime: 42000.0, 
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