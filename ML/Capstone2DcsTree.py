"""Algorithm	Model line              	Scaling?
Logistic Regression	LogisticRegression()	✅ Yes
KNN	              KNeighborsClassifier()	✅ Yes
Decision Tree	   DecisionTreeClassifier()	❌ No
Random Forest	   RandomForestClassifier()	❌ No
SVM	                 SVC()              	✅ Yes
Naive Bayes     	GaussianNB()	Usually ❌
Gradient Boosting	GradientBoostingClassifier()	❌ No
AdaBoost	        AdaBoostClassifier()	❌ No
Extra Trees	        ExtraTreesClassifier()	❌ No
XGBoost         	XGBClassifier() """



import pandas as pd
import sklearn as sk
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score,confusion_matrix,classification_report
from sklearn.preprocessing import StandardScaler

data = pd.read_csv("Telco-Customer-Churn.csv")

print(data.isnull().sum())
print(data.duplicated().sum())
print(data['TotalCharges'].value_counts())
print(data.shape)
print(data.describe())
data['TotalCharges'] = data['TotalCharges'].replace(" ",pd.NA)
data['TotalCharges'] = pd.to_numeric(data['TotalCharges'])
data['TotalCharges'] = data['TotalCharges'].fillna(data['TotalCharges'].mean())

print(data.info())


data['Churn'] = data['Churn'].map({
    'Yes' : 1 ,
    'No' : 0
})
data = pd.get_dummies(data,drop_first=True)


X = data.drop('Churn', axis=1)
y = data['Churn']



X_train, X_test, y_train, y_test = train_test_split(X,y,random_state=42,test_size=0.2)

model = DecisionTreeClassifier(class_weight='balanced')

# scaler = StandardScaler()

# X_train = scaler.fit_transform(X_train)
# X_test = scaler.transform(X_test)

model.fit(X_train,y_train)

predict  = model.predict(X_test)


print("Accuracy Score :-  " ,accuracy_score(y_test,predict))
print("Confusion Matrix :-  " , confusion_matrix(y_test,predict))
print("Classification Report :- "  ,  classification_report(y_test , predict))

predict = pd.Series(predict).map({
    1: "Yes",
    0 : "No"
})
print(predict.to_string())