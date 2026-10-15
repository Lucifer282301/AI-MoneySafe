# Configures the iOS project for a cloud build (GitHub Actions or Codemagic), so nothing here
# needs a Mac or Xcode. Run before `pod install`:  ruby scripts/ios_configure.rb
#
# What it does:
#  1. Adds GoogleService-Info.plist to the app target's bundle resources (push notifications).
#  2. When ENV['ENABLE_PUSH'] == '1', points the target at MoneySafeApp.entitlements so the
#     Push Notifications capability is included in the build. Leave this unset for the free,
#     unsigned-build route (a free Apple ID cannot sign an app that uses push).
require 'xcodeproj'

app = 'MoneySafeApp'
plist_path = "ios/#{app}/GoogleService-Info.plist"
abort("Missing #{plist_path}. Download it from Firebase (iOS app) and commit it.") unless File.exist?(plist_path)

project = Xcodeproj::Project.open("ios/#{app}.xcodeproj")
target = project.targets.find { |t| t.name == app }
abort("Target #{app} not found in the Xcode project") unless target

group = project.main_group.find_subpath(app, true)

unless group.files.any? { |f| f.path == 'GoogleService-Info.plist' }
  ref = group.new_reference('GoogleService-Info.plist')
  target.resources_build_phase.add_file_reference(ref, true)
end

if ENV['ENABLE_PUSH'] == '1'
  target.build_configurations.each do |config|
    config.build_settings['CODE_SIGN_ENTITLEMENTS'] = "#{app}/#{app}.entitlements"
  end
end

project.save
puts "iOS project configured (push entitlement: #{ENV['ENABLE_PUSH'] == '1'})"
