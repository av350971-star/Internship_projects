import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import sklearn as sk
from sklearn.model_selection import train_test_split
from sklearn.linear_model import  LogisticRegression
from sklearn.metrics import accuracy_score,confusion_matrix,classification_report
from sklearn.preprocessing import StandardScaler

data = pd.read_csv("Telco-Customer-Churn.csv")
 #data cleaning

data.shape
data.describe()
data.isnull().sum()
data.duplicated().sum()
data["TotalCharges"].value_counts()
data['TotalCharges'] = data['TotalCharges'].replace(" ",pd.NA)

data['TotalCharges'] = pd.to_numeric(data['TotalCharges'])
data['TotalCharges'] = data['TotalCharges'].fillna(data['TotalCharges'].mean())
data.info()



# EDA

sns.countplot( data=data, x="Churn" )
plt.show()

sns.boxplot(data=data, x="Churn", y="MonthlyCharges")
plt.show()

sns.countplot(data=data,x='Contract',hue='Churn')

plt.show()

sns.countplot(data=data,x='InternetService',hue='Churn')

sns.boxplot(data=data, x="Churn", y="TotalCharges")
plt.show()


data['Churn'] = data['Churn'].map({
    'Yes' : 1,
    'No' : 0
}
)
data = pd.get_dummies(data , drop_first = True)
#data = data.drop("customerID", axis=1)



X = data.drop('Churn', axis=1)
y = data['Churn']

X_train,X_test,y_train,y_test = train_test_split(X,y,random_state=42 , test_size=0.2)

scaler = StandardScaler()

X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)


model = LogisticRegression(max_iter=1000 , class_weight="balanced")

model.fit(X_train,y_train)

prediction = model.predict(X_test)



accuracy = accuracy_score(y_test ,prediction)
print("Accuracy :- " , accuracy)

print("\n Classification Report")
print(classification_report(y_test,prediction))

print("\n Confusion Matrix")
print(confusion_matrix(y_test,prediction))


prediction = pd.Series(prediction).map({
    0: 'No',
    1: 'Yes'
})

print('Prediction :- ' , prediction.to_string())