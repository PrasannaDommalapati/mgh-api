import groovy.json.JsonOutput

def notifySlack(text, attachments) {

    def slackURL   = 'https://hooks.slack.com/services/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'

    def payload = JsonOutput.toJson([
        text:        text,
        channel:     '#jenkins',
        attachments: attachments
    ])

    sh "curl -X POST --data-urlencode \'payload=${payload}\' ${slackURL}"
}

node('master') {

    try {

        stage("Build") {

            def workspace = pwd()

            checkout scm

            docker.image("anywaste/app:latest").pull()

            docker.image("anywaste/app:latest").inside {

                sh '''
                    npm prune
                    npm install
                '''
            }
        }
        stage("Test") {

            def workspace = pwd()

            docker.image("anywaste/app:latest").inside {

                sh "npm test"
            }
        }
        stage("Deploy") {

            withCredentials([string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'), string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')]) {

                def GIT_TAG = sh(returnStdout: true, script: "git tag --points-at HEAD").trim();

                if (GIT_TAG) {

                    docker.image("anywaste/app:latest").inside("-e AWS_ACCESS_KEY_ID=\"${AWS_ACCESS_KEY_ID}\" -e AWS_SECRET_ACCESS_KEY=\"${AWS_SECRET_ACCESS_KEY}\"") {

                        sh "npm run deploy"
                    }

                } else {

                    echo "Not deploying: ${env.BRANCH_NAME}"
                }

                currentBuild.result = "SUCCESS"
            }
        }

    } catch (e) {

        echo 'Something went wrong'
        currentBuild.result = "FAILED"

        throw e

    } finally {

        def GIT_TAG = sh(returnStdout: true, script: "git tag --points-at HEAD").trim();

        if (GIT_TAG) {

            echo 'send slack notification'

            def buildColor = 'good'

            if (currentBuild.result == 'FAILED') {

                buildColor = 'danger'
            }

            def title = "${currentBuild.fullDisplayName}"
            def text  = "The pipeline ${currentBuild.fullDisplayName} completed.\nView test results <${BUILD_URL}|${GIT_TAG}:${BUILD_DISPLAY_NAME}>"

            notifySlack (currentBuild.result, [[
                title: title,
                color: buildColor,
                text:  text
            ]])
        } else {

            echo "${currentBuild.fullDisplayName}: The pipeline ${currentBuild.fullDisplayName} completed."
        }
    }
}