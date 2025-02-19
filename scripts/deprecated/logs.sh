aws logs get-log-events   --log-group-name /ecs/leftcurve-api   --log-stream-name $(aws logs describe-log-streams --log-group-name /ecs/leftcurve-api --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text) >> logs/logs.txt <<< EOF

aws ecs describe-services   --cluster leftcurve-cluster   --services leftcurve-service   --query 'services[].events[]' >> logs/events.txt <<< EOF

aws ecs list-tasks   --cluster leftcurve-cluster   --service-name leftcurve-service >> logs/tasks.txt <<< EOF

aws ecs describe-services   --cluster leftcurve-cluster   --services leftcurve-service >> logs/services.txt <<< EOF