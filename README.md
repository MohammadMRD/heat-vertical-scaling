# Heat - Vertical Scaling

## Getting started
1. Clone project
2. Go to the project directory
2. Run `npm start`
3. Create a heat template
4. Define a scaling resource using `OS::Heat::AutoScalingGroup`
5. Define an alarm and set the URL of this service to alarm's actions(alarm_action, ok_action, ...)

## Request parameters
- **action**: `up` or `down`
- **flavors**: List of flavors id or name
- **group**: Scaling resource's name (optional)

## HOT example

```yaml
heat_template_version: 2018-08-31
description: A simple stack

parameters:
  flavor_type:
    type: string
  image_id:
    type: string
  network_id:
    type: string

resources:
  scale_group:
    type: OS::Heat::AutoScalingGroup
    properties:
      min_size: 1
      max_size: 3
      resource:
        type: OS::Nova::Server
        properties:
          flavor: { get_param: flavor_type }
          image: { get_param: image_id }
          metadata: {"metering.server_group": {get_param: "OS::stack_id"}}
          networks:
            - network: { get_param: network_id }

  cpu_alarm_high:
    type: OS::Aodh::GnocchiAggregationByResourcesAlarm
    properties:
      description: Scale up if CPU > 80% for 5 minutes
      metric: cpu_util
      aggregation_method: mean
      granularity: 300
      evaluation_periods: 1
      threshold: 80
      resource_type: instance
      comparison_operator: gt
      alarm_actions:
        - http://SERVICE_URL?action=up&flavors=c1&flavors=c2&flavors=c3&group=scale_group
      query:
        list_join:
          - ''
          - - {'=': {server_group: {get_param: "OS::stack_id"}}}
  cpu_alarm_low:
    type: OS::Aodh::GnocchiAggregationByResourcesAlarm
    properties:
      description: Scale down if CPU < 5% for 5 minutes
      metric: cpu_util
      aggregation_method: mean
      granularity: 300
      evaluation_periods: 1
      threshold: 5
      resource_type: instance
      comparison_operator: lt
      alarm_actions:
        - http://SERVICE_URL?action=down&flavors=c1&flavors=c2&flavors=c3&group=scale_group
      query:
        list_join:
          - ''
          - - {'=': {server_group: {get_param: "OS::stack_id"}}}
outputs:
  # refs or scale_group_refs
  scale_group_refs:
    value: { get_attr: [scale_group, refs] }
```
